import React from "react"
import './_ruleOrReg.scss'
import { ruleOrRegType, ruleSubsectionType } from "../../../../shared/types"
import { editStateType } from "../RulesAndRegsPicker"
import EditButton from "../../button/editButton/EditButton"
import TextIcon from "../../icon/textIcon/TextIcon"

interface rOrrType {
  index: number
  item: ruleOrRegType
  setEdit: React.Dispatch<React.SetStateAction<editStateType>>
  isDefault?: boolean // if Truthy, the rule or reg matches a rule reg from the default rule reg array.
}

const RuleOrReg: React.FC<rOrrType> = ({ index, item, setEdit, isDefault }) => (
  <div className="rule-or-reg">
    <div className="main">
      <div className="title">
        <h4>{`${index}.`}</h4>
      </div>
      <p>{item.text}</p>
    </div>
    {item.subsections && item.subsections.map((r: ruleSubsectionType, i: number) => {
      return (
        <div key={i} className="subsection">
          <div className="title" >
            <p>{`${index}.${i + 1}`}</p>
          </div>
          <p>{r.text}</p>
        </div>
      )
    })}
    <div className="toolbar">
      {isDefault && 
        <TextIcon 
          text="Default" 
          size="small"
        />
      }
      <EditButton
        size="small"
        onClick={e => setEdit(prevEdit => {
          return {
            ...prevEdit,
            index,
            ruleReg: item,
          }
        })}
      />
    </div>
  </div>
)

export default RuleOrReg
