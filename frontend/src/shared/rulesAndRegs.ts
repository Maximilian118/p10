import moment from "moment"
import { userType } from "./localStorage"
import { ruleOrRegType, rulesAndRegsListType } from "./types"

export const newRuleOrReg = (
  user: userType,
  text: string,
  subsections?: string[],
): ruleOrRegType => {
  const ruleOrReg: ruleOrRegType = {
    text,
    created_by: user,
    created_at: moment().format(),
    history: [],
    subsections: [],
  }

  if (subsections) {
    ruleOrReg.subsections = subsections.map((subText: string): ruleOrRegType => {
      return {
        text: subText,
        created_by: user,
        created_at: moment().format(),
        history: [],
      }
    })
  }

  return ruleOrReg
}

export const globalRulesAndRegs = (user: userType): rulesAndRegsListType => {
  const globalRulesAndRegs: ruleOrRegType[] = [
    newRuleOrReg(user, "The adjudicator of a championship may change on a race by race basis.", [
      "There may be only one adjudicator per race weekend.",
    ]),
    newRuleOrReg(
      user,
      "Wagers are permitted. However, this is a family fun game and heavy wagers are not in the spirit of the game.",
    ),
    newRuleOrReg(
      user,
      "Any changes to the rules and regulations of a championship can be requested via the application and will be accepted or denied via a voting process.",
      [
        "The adjudicator of the championship must accept any rules & regulations change requests before the voting process begins.",
        "All current competitors can vote excluding any guests.",
        "If the vote reaches a determination then the voting process will automatically close. However, if there are not enough votes then the process will expire after 5 days and there will be no change.",
      ],
    ),
  ]

  return globalRulesAndRegs
}

export const defaultRulesAndRegs = (user: userType): rulesAndRegsListType => {
  const rulesAndRegs: ruleOrRegType[] = [
    newRuleOrReg(
      user,
      "The winning driver must be included in the last session of qualifying.",
    ),
    newRuleOrReg(
      user,
      "Points are applied after every car finishes its last lap prior to any penalties or deductions.",
    ),
    newRuleOrReg(user, "Bets are handled on a first come first serve basis.", [
      "If two or more competitors communicate their bets verbally and it's unclear as to who placed their bet first the adjudicator will reach a determination solely at their discretion.",
    ]),
    newRuleOrReg(
      user,
      "Bets must be declared directly to the adjudicator verbally, via a Whatsapp group or via this application.",
      [
        "Two or more competitors can not bet on the same driver.",
        "If a competitor wishes to declare a bet via Whatsapp he/she must do so in a group that contains at least two other competitors as members with disappearing messages disabled.",
      ],
    ),
    newRuleOrReg(
      user,
      "There must be no more competitors than there are drivers on any given series event.",
      [
        "Guest competitors are allowed if there are fewer competitors than drivers. Competitors competing for a championship take precedence over guests.",
        "If a guest competitor is attending more than 50% of the series events he/she may apply to the adjudicator to become a competitor verbally or via the application. The adjudicator can then decide to accept, deny or start a voting process.",
      ],
    ),
    newRuleOrReg(
      user,
      "The betting window will open upon announcement from the adjudicator up to 10 minutes before the first qualifying session and closes 5 minutes after the start of the first qualifying session.",
    ),
    newRuleOrReg(
      user,
      "The adjudicator can only bet after at least 2 bets have already been declared.",
    ),
    newRuleOrReg(
      user,
      "Any changes to the rules and regulations can be requested via the application and will be accepted or denied via a voting process.",
      [
        "The adjudicator must accept any rules & regulations change requests before the voting process begins.",
        "All current competitors can vote.",
        "If the vote reaches a determination then the voting process will automatically close. However, if there are not enough votes then the process will expire after 5 days and there will be no change.",
      ],
    ),
  ]

  return rulesAndRegs
}

// Checks if given rule or reg is a default.
export const isDefaultRorR = (user: userType, rOrr: ruleOrRegType): boolean => {
  let isDefault = false

  const toStrings = (item: ruleOrRegType): string[] => {
    const subs = item.subsections?.map((r) => r.text)

    if (subs) {
      return [item.text, ...subs]
    } else {
      return [item.text]
    }
  }

  defaultRulesAndRegs(user).forEach((item) => {
    if (JSON.stringify(toStrings(item)) === JSON.stringify(toStrings(rOrr))) {
      isDefault = true
    }
  })

  return isDefault
}
