import React, { useContext, useEffect, useState } from "react"
import { graphQLErrorType, initGraphQLError } from "../shared/requests/requestsUtility"
import { Button, CircularProgress } from "@mui/material"
import { useNavigate } from "react-router-dom"
import { presetArrays } from "../components/utility/pointsPicker/ppPresets"
import { badgeType, driverGroupType, pointsStructureType, rulesAndRegsType } from "../shared/types"
import { defaultRulesAndRegs } from "../shared/rulesAndRegs"
import AppContext from "../context"
import ChampBasicsCard from "../components/cards/champBasicsCard/ChampBasicsCard"
import { muiStepperSteps } from "../components/utility/muiStepper/muiStepperUtility"
import ChampHeaderCard from "../components/cards/champHeaderCard/ChampHeaderCard"
import DriverGroupPicker from "../components/utility/driverGroupPicker/DriverGroupPicker"
import RulesAndRegsPicker from "../components/utility/rulesAndRegsPicker/RulesAndRegsPicker"
import BadgePicker from "../components/utility/badgePicker/BadgePicker"
import ChampCompleteCard from "../components/cards/champCompleteCard/ChampCompleteCard"
import { createChamp } from "../shared/requests/champRequests"

interface createChampFormBaseType {
  champName: string
  rounds: number | string
}

export interface createChampFormType extends createChampFormBaseType {
  driverGroup: driverGroupType | null
  icon: File | null
  profile_picture: File | null
  pointsStructure: pointsStructureType
  rulesAndRegs: rulesAndRegsType
  champBadges: badgeType[]
}

export interface createChampFormErrType extends createChampFormBaseType {
  driverGroup: string
  dropzone: string
  pointsStructure: string
  rulesAndRegs: string
  champBadges: string
  [key: string]: string | number
}

const CreateChamp: React.FC = () => {
  const { user, setUser } = useContext(AppContext)
  const [ loading, setLoading ] = useState<boolean>(false) // loading for createChamp req.
  const [ backendErr, setBackendErr ] = useState<graphQLErrorType>(initGraphQLError)
  const [ activeStep, setActiveStep ] = useState<number>(0) // Active step for stepper component.
  const [ stepperBtns, setStepperBtns ] = useState<JSX.Element>(<></>) // button-bar component to be distributed across child components as needed.
  const [ badgesReqSent, setBadgesReqSent ] = useState<boolean>(false) // As we can unload the badge picker component. State to dictate wheather to send another req is in parent.
  const [ defaultBadges, setDefaultBadges ] = useState<badgeType[]>([]) // For the same reason the res of getBadges sits here.
  const [ groups, setGroups ] = useState<driverGroupType[]>([]) // Stores all driver groups from getDriverGroups response in DriverGroupPicker.
  const [ form, setForm ] = useState<createChampFormType>({
    champName: "",
    rounds: 24,
    driverGroup: null,
    icon: null,
    profile_picture: null,
    pointsStructure: presetArrays(1).map(item => {
      return {
        position: item.result,
        points: item.value,
      }
    }),
    rulesAndRegs: defaultRulesAndRegs(user),
    champBadges: [],
  })
  const [ formErr, setFormErr ] = useState<createChampFormErrType>({
    driverGroup: "",
    champName: "",
    rounds: "",
    dropzone: "",
    pointsStructure: "",
    rulesAndRegs: "",
    champBadges: "",
  })

  const navigate = useNavigate()

  // Handles form submission - validates and creates the championship
  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate required fields before submission
    if (!form.champName) {
      setFormErr(prev => ({ ...prev, champName: "Championship name is required." }))
      return
    }

    if (!form.driverGroup) {
      setFormErr(prev => ({ ...prev, driverGroup: "A driver group is required." }))
      return
    }

    if (form.pointsStructure.length === 0) {
      setFormErr(prev => ({ ...prev, pointsStructure: "Points structure is required." }))
      return
    }

    if (form.rulesAndRegs.length === 0) {
      setFormErr(prev => ({ ...prev, rulesAndRegs: "At least one rule is required." }))
      return
    }

    // Call the createChamp API
    const champ = await createChamp(
      form,
      user,
      setUser,
      navigate,
      setLoading,
      setBackendErr,
    )

    // Navigate to championship dashboard on success
    if (champ && champ._id) {
      navigate(`/championship/${champ._id}`)
    }
  }

  const firstStep = activeStep === 0
  const lastStep = muiStepperSteps.createChamp.length === activeStep

  useEffect(() => {
    setStepperBtns(() =>  <div className="button-bar">
      <Button
        variant="contained" 
        color="inherit"
        disabled={firstStep}
        onClick={() => !firstStep && setActiveStep(prevStep => prevStep - 1)}
      >Back</Button>
      <Button 
        variant="contained" 
        type={lastStep ? "submit" : "button"}
        onClick={() => !lastStep && setActiveStep(prevStep => prevStep + 1)}
        startIcon={loading && <CircularProgress size={20} color={"inherit"}/>}
      >{lastStep ? "Create Championship" : "Next"}</Button>
    </div>)
  }, [firstStep, lastStep, loading])

  const contentMargin = { marginBottom: 78.5 }

  return (
    <form className="content-container" onSubmit={e => onSubmitHandler(e)} style={{ height: "100vh" }}>
      <ChampHeaderCard activeStep={activeStep}/>
        {activeStep === 0 && 
        <ChampBasicsCard
          form={form}
          setForm={setForm}
          formErr={formErr}
          setFormErr={setFormErr}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          stepperBtns={stepperBtns}
          style={contentMargin}
        />
      }
      {activeStep === 1 && 
        <DriverGroupPicker
          form={form}
          setForm={setForm}
          groups={groups}
          setGroups={setGroups}
          user={user}
          setUser={setUser}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          stepperBtns={stepperBtns}
          style={contentMargin}
        />
      }
      {activeStep === 2 && 
        <RulesAndRegsPicker
          user={user}
          form={form}
          setForm={setForm}
          stepperBtns={stepperBtns}
          style={contentMargin}
        />
      }
      {activeStep === 3 && 
        <BadgePicker
          form={form}
          setForm={setForm}
          user={user}
          setUser={setUser}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
          stepperBtns={stepperBtns}
          style={contentMargin}
          badgesReqSent={badgesReqSent}
          setBadgesReqSent={setBadgesReqSent}
          defaultBadges={defaultBadges}
          setDefaultBadges={setDefaultBadges}
        />
      }
      {activeStep === 4 &&
        <ChampCompleteCard
          stepperBtns={stepperBtns}
          backendErr={backendErr}
        />
      }
    </form>
  )
}

export default CreateChamp
