import { ChampType, pointsStructureType } from "../../shared/types"
import { ChampSettingsFormType } from "./Views/ChampSettings/ChampSettings"
import { AutomationFormType } from "./Views/Automation/Automation"
import { ProtestsFormType, RuleChangesFormType } from "../../shared/formValidation"

// ============================================
// Form Initialization Functions
// ============================================

// Initialize settings form state from championship data.
export const initSettingsForm = (champ: ChampType): ChampSettingsFormType => ({
  champName: champ.name,
  rounds: champ.rounds.length,
  maxCompetitors: champ.settings.maxCompetitors,
  pointsStructure: champ.pointsStructure,
  icon: null,
  profile_picture: null,
  inviteOnly: champ.settings.inviteOnly,
  active: champ.active,
  series: champ.series,
})

// Initialize automation form state from championship data.
export const initAutomationForm = (champ: ChampType): AutomationFormType => ({
  enabled: champ.settings.automation?.enabled ?? false,
  autoOpen: champ.settings.automation?.bettingWindow?.autoOpen ?? false,
  autoOpenTime: champ.settings.automation?.bettingWindow?.autoOpenTime ?? 10,
  autoClose: champ.settings.automation?.bettingWindow?.autoClose ?? false,
  autoCloseTime: champ.settings.automation?.bettingWindow?.autoCloseTime ?? 5,
  autoNextRound: champ.settings.automation?.round?.autoNextRound ?? false,
  autoNextRoundTime: champ.settings.automation?.round?.autoNextRoundTime ?? 60,
})

// Initialize protests form state from championship data.
export const initProtestsForm = (champ: ChampType): ProtestsFormType => {
  const expiryDays = Math.round((champ.settings.protests?.expiry ?? 10080) / 1440)
  return {
    alwaysVote: champ.settings.protests?.alwaysVote ?? false,
    allowMultiple: champ.settings.protests?.allowMultiple ?? false,
    expiry: expiryDays,
  }
}

// Initialize rule changes form state from championship data.
export const initRuleChangesForm = (champ: ChampType): RuleChangesFormType => {
  const expiryDays = Math.round((champ.settings.ruleChanges?.expiry ?? 10080) / 1440)
  return {
    alwaysVote: champ.settings.ruleChanges?.alwaysVote ?? false,
    allowMultiple: champ.settings.ruleChanges?.allowMultiple ?? false,
    expiry: expiryDays,
  }
}

// ============================================
// Change Detection Functions
// ============================================

// Check if settings form has changes compared to championship data.
export const hasSettingsChanged = (form: ChampSettingsFormType, champ: ChampType): boolean => {
  return (
    form.champName !== champ.name ||
    form.rounds !== champ.rounds.length ||
    form.maxCompetitors !== champ.settings.maxCompetitors ||
    JSON.stringify(form.pointsStructure) !== JSON.stringify(champ.pointsStructure) ||
    form.icon !== null ||
    form.profile_picture !== null ||
    form.inviteOnly !== champ.settings.inviteOnly ||
    form.active !== champ.active ||
    form.series?._id !== champ.series._id
  )
}

// Check if automation form has changes compared to championship data.
export const hasAutomationChanged = (form: AutomationFormType, champ: ChampType): boolean => {
  return (
    form.enabled !== (champ.settings.automation?.enabled ?? false) ||
    form.autoOpen !== (champ.settings.automation?.bettingWindow?.autoOpen ?? false) ||
    form.autoOpenTime !== (champ.settings.automation?.bettingWindow?.autoOpenTime ?? 10) ||
    form.autoClose !== (champ.settings.automation?.bettingWindow?.autoClose ?? false) ||
    form.autoCloseTime !== (champ.settings.automation?.bettingWindow?.autoCloseTime ?? 5) ||
    form.autoNextRound !== (champ.settings.automation?.round?.autoNextRound ?? false) ||
    form.autoNextRoundTime !== (champ.settings.automation?.round?.autoNextRoundTime ?? 60)
  )
}

// Check if protests form has changes compared to championship data.
export const hasProtestsChanged = (form: ProtestsFormType, champ: ChampType): boolean => {
  return (
    form.alwaysVote !== (champ.settings.protests?.alwaysVote ?? false) ||
    form.allowMultiple !== (champ.settings.protests?.allowMultiple ?? false) ||
    form.expiry !== Math.round((champ.settings.protests?.expiry ?? 10080) / 1440)
  )
}

// Check if rule changes form has changes compared to championship data.
export const hasRuleChangesChanged = (form: RuleChangesFormType, champ: ChampType): boolean => {
  return (
    form.alwaysVote !== (champ.settings.ruleChanges?.alwaysVote ?? false) ||
    form.allowMultiple !== (champ.settings.ruleChanges?.allowMultiple ?? false) ||
    form.expiry !== Math.round((champ.settings.ruleChanges?.expiry ?? 10080) / 1440)
  )
}

// ============================================
// Updates Builder Types
// ============================================

export interface SettingsUpdatesType {
  name?: string
  rounds?: number
  maxCompetitors?: number
  pointsStructure?: pointsStructureType
  icon?: string
  inviteOnly?: boolean
  active?: boolean
  series?: string
  profile_picture?: string
}

export interface AutomationUpdatesType {
  enabled?: boolean
  bettingWindow?: {
    autoOpen?: boolean
    autoOpenTime?: number
    autoClose?: boolean
    autoCloseTime?: number
  }
  round?: {
    autoNextRound?: boolean
    autoNextRoundTime?: number
  }
}

export interface ProtestsUpdatesType {
  alwaysVote?: boolean
  allowMultiple?: boolean
  expiry?: number
}

export interface RuleChangesUpdatesType {
  alwaysVote?: boolean
  allowMultiple?: boolean
  expiry?: number
}

// ============================================
// Updates Builder Functions
// ============================================

// Build settings updates object with only changed fields (excluding file uploads).
export const buildSettingsUpdates = (form: ChampSettingsFormType, champ: ChampType): SettingsUpdatesType => {
  const updates: SettingsUpdatesType = {}

  if (form.champName !== champ.name) {
    updates.name = form.champName
  }

  if (form.rounds !== champ.rounds.length) {
    updates.rounds = form.rounds
  }

  if (form.maxCompetitors !== champ.settings.maxCompetitors) {
    updates.maxCompetitors = form.maxCompetitors
  }

  if (JSON.stringify(form.pointsStructure) !== JSON.stringify(champ.pointsStructure)) {
    updates.pointsStructure = form.pointsStructure
  }

  if (form.inviteOnly !== champ.settings.inviteOnly) {
    updates.inviteOnly = form.inviteOnly
  }

  if (form.active !== champ.active) {
    updates.active = form.active
  }

  if (form.series?._id !== champ.series._id && form.series?._id) {
    updates.series = form.series._id
  }

  return updates
}

// Build automation updates object with only changed fields.
export const buildAutomationUpdates = (form: AutomationFormType, champ: ChampType): AutomationUpdatesType => {
  const updates: AutomationUpdatesType = {}

  if (form.enabled !== (champ.settings.automation?.enabled ?? false)) {
    updates.enabled = form.enabled
  }

  const bettingWindowUpdates: AutomationUpdatesType["bettingWindow"] = {}

  if (form.autoOpen !== (champ.settings.automation?.bettingWindow?.autoOpen ?? false)) {
    bettingWindowUpdates.autoOpen = form.autoOpen
  }
  if (form.autoOpenTime !== (champ.settings.automation?.bettingWindow?.autoOpenTime ?? 10)) {
    bettingWindowUpdates.autoOpenTime = form.autoOpenTime
  }
  if (form.autoClose !== (champ.settings.automation?.bettingWindow?.autoClose ?? false)) {
    bettingWindowUpdates.autoClose = form.autoClose
  }
  if (form.autoCloseTime !== (champ.settings.automation?.bettingWindow?.autoCloseTime ?? 5)) {
    bettingWindowUpdates.autoCloseTime = form.autoCloseTime
  }

  if (Object.keys(bettingWindowUpdates).length > 0) {
    updates.bettingWindow = bettingWindowUpdates
  }

  const roundUpdates: AutomationUpdatesType["round"] = {}

  if (form.autoNextRound !== (champ.settings.automation?.round?.autoNextRound ?? false)) {
    roundUpdates.autoNextRound = form.autoNextRound
  }
  if (form.autoNextRoundTime !== (champ.settings.automation?.round?.autoNextRoundTime ?? 60)) {
    roundUpdates.autoNextRoundTime = form.autoNextRoundTime
  }

  if (Object.keys(roundUpdates).length > 0) {
    updates.round = roundUpdates
  }

  return updates
}

// Build protests updates object with only changed fields.
export const buildProtestsUpdates = (form: ProtestsFormType, champ: ChampType): ProtestsUpdatesType => {
  const updates: ProtestsUpdatesType = {}

  if (form.alwaysVote !== (champ.settings.protests?.alwaysVote ?? false)) {
    updates.alwaysVote = form.alwaysVote
  }

  if (form.allowMultiple !== (champ.settings.protests?.allowMultiple ?? false)) {
    updates.allowMultiple = form.allowMultiple
  }

  const currentExpiryDays = Math.round((champ.settings.protests?.expiry ?? 10080) / 1440)
  if (form.expiry !== currentExpiryDays) {
    updates.expiry = form.expiry * 1440
  }

  return updates
}

// Build rule changes updates object with only changed fields.
export const buildRuleChangesUpdates = (form: RuleChangesFormType, champ: ChampType): RuleChangesUpdatesType => {
  const updates: RuleChangesUpdatesType = {}

  if (form.alwaysVote !== (champ.settings.ruleChanges?.alwaysVote ?? false)) {
    updates.alwaysVote = form.alwaysVote
  }

  if (form.allowMultiple !== (champ.settings.ruleChanges?.allowMultiple ?? false)) {
    updates.allowMultiple = form.allowMultiple
  }

  const currentExpiryDays = Math.round((champ.settings.ruleChanges?.expiry ?? 10080) / 1440)
  if (form.expiry !== currentExpiryDays) {
    updates.expiry = form.expiry * 1440
  }

  return updates
}

// ============================================
// Optimistic Update Functions
// ============================================

// Apply settings updates optimistically to championship state.
export const applySettingsOptimistically = (
  champ: ChampType,
  updates: SettingsUpdatesType,
  form: ChampSettingsFormType
): ChampType => {
  const optimisticChamp = { ...champ }

  if (updates.name) {
    optimisticChamp.name = updates.name
  }

  if (updates.pointsStructure) {
    optimisticChamp.pointsStructure = updates.pointsStructure
  }

  if (updates.maxCompetitors) {
    optimisticChamp.settings = {
      ...optimisticChamp.settings,
      maxCompetitors: updates.maxCompetitors,
    }
  }

  if (typeof updates.inviteOnly === "boolean") {
    optimisticChamp.settings = {
      ...optimisticChamp.settings,
      inviteOnly: updates.inviteOnly,
    }
  }

  if (typeof updates.active === "boolean") {
    optimisticChamp.active = updates.active
  }

  if (updates.icon) {
    optimisticChamp.icon = updates.icon
  }

  if (updates.profile_picture) {
    optimisticChamp.profile_picture = updates.profile_picture
  }

  if (updates.rounds) {
    const currentRoundsCount = champ.rounds.length

    if (updates.rounds > currentRoundsCount) {
      const newRounds = [...champ.rounds]
      for (let i = currentRoundsCount + 1; i <= updates.rounds; i++) {
        newRounds.push({
          round: i,
          status: "waiting" as const,
          winner: null,
          runnerUp: null,
          competitors: [],
          drivers: [],
          teams: [],
        })
      }
      optimisticChamp.rounds = newRounds
    } else if (updates.rounds < currentRoundsCount) {
      optimisticChamp.rounds = champ.rounds.slice(0, updates.rounds)
    }
  }

  if (updates.series && form.series) {
    optimisticChamp.series = form.series
  }

  return optimisticChamp
}

// Apply automation updates optimistically to championship state.
export const applyAutomationOptimistically = (
  champ: ChampType,
  updates: AutomationUpdatesType
): ChampType => {
  return {
    ...champ,
    settings: {
      ...champ.settings,
      automation: {
        ...champ.settings.automation,
        enabled: updates.enabled ?? champ.settings.automation?.enabled ?? false,
        bettingWindow: {
          ...champ.settings.automation.bettingWindow,
          autoOpen: updates.bettingWindow?.autoOpen ?? champ.settings.automation.bettingWindow.autoOpen,
          autoOpenTime: updates.bettingWindow?.autoOpenTime ?? champ.settings.automation.bettingWindow.autoOpenTime,
          autoClose: updates.bettingWindow?.autoClose ?? champ.settings.automation.bettingWindow.autoClose,
          autoCloseTime: updates.bettingWindow?.autoCloseTime ?? champ.settings.automation.bettingWindow.autoCloseTime,
        },
        round: {
          ...champ.settings.automation.round,
          autoNextRound: updates.round?.autoNextRound ?? champ.settings.automation.round.autoNextRound,
          autoNextRoundTime: updates.round?.autoNextRoundTime ?? champ.settings.automation.round.autoNextRoundTime,
        },
      },
    },
  }
}

// Apply protests updates optimistically to championship state.
export const applyProtestsOptimistically = (
  champ: ChampType,
  updates: ProtestsUpdatesType
): ChampType => {
  return {
    ...champ,
    settings: {
      ...champ.settings,
      protests: {
        ...champ.settings.protests,
        alwaysVote: updates.alwaysVote ?? champ.settings.protests.alwaysVote,
        allowMultiple: updates.allowMultiple ?? champ.settings.protests.allowMultiple,
        expiry: updates.expiry ?? champ.settings.protests.expiry,
      },
    },
  }
}

// Apply rule changes updates optimistically to championship state.
export const applyRuleChangesOptimistically = (
  champ: ChampType,
  updates: RuleChangesUpdatesType
): ChampType => {
  return {
    ...champ,
    settings: {
      ...champ.settings,
      ruleChanges: {
        ...champ.settings.ruleChanges,
        alwaysVote: updates.alwaysVote ?? champ.settings.ruleChanges.alwaysVote,
        allowMultiple: updates.allowMultiple ?? champ.settings.ruleChanges.allowMultiple,
        expiry: updates.expiry ?? champ.settings.ruleChanges.expiry,
      },
    },
  }
}
