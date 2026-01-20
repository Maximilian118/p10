import React, { useContext, useState, useCallback, useMemo } from "react"
import { graphQLErrorType, initGraphQLError } from "../../shared/requests/requestsUtility"
import { useNavigate } from "react-router-dom"
import { presetArrays } from "../../components/utility/pointsPicker/ppPresets"
import { badgeType, seriesType, pointsStructureType, rulesAndRegsType } from "../../shared/types"
import { defaultRulesAndRegs } from "../../shared/rulesAndRegs"
import AppContext from "../../context"
import { ChampFlowProvider, FormHandlers, getActiveHandlers } from "../../context/ChampFlowContext"
import ChampBasicsCard from "../../components/cards/champBasicsCard/ChampBasicsCard"
import { muiStepperSteps } from "../../components/utility/muiStepper/muiStepperUtility"
import CreateChampHeader from "../../components/cards/createChampHeader/CreateChampHeader"
import SeriesPicker from "../../components/utility/seriesPicker/SeriesPicker"
import RulesAndRegsPicker from "../../components/utility/rulesAndRegsPicker/RulesAndRegsPicker"
import BadgePicker from "../../components/utility/badgePicker/BadgePicker"
import ChampCompleteCard from "../../components/cards/champCompleteCard/ChampCompleteCard"
import { ArrowBack, Delete } from "@mui/icons-material"
import ButtonBar from "../../components/utility/buttonBar/ButtonBar"
import { createChamp } from "../../shared/requests/champRequests"
import Toggle from "../../components/utility/toggle/Toggle"
import Arrows from "../../components/utility/arrows/Arrows"
import { validateChampForm } from "./createChampUtility"

interface createChampFormBaseType {
  champName: string
  rounds: number | string
}

export interface createChampFormType extends createChampFormBaseType {
  series: seriesType | null
  icon: File | string | null
  profile_picture: File | string | null
  pointsStructure: pointsStructureType
  rulesAndRegs: rulesAndRegsType
  champBadges: badgeType[]
  inviteOnly: boolean
}

export interface createChampFormErrType extends createChampFormBaseType {
  series: string
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
  const [ badgesReqSent, setBadgesReqSent ] = useState<boolean>(false) // As we can unload the badge picker component. State to dictate wheather to send another req is in parent.
  const [ defaultBadges, setDefaultBadges ] = useState<badgeType[]>([]) // For the same reason the res of getBadges sits here.
  const [ seriesList, setSeriesList ] = useState<seriesType[]>([]) // Stores all series from getSeries response in SeriesPicker.
  const [ handlerStack, setHandlerStack ] = useState<FormHandlers[]>([]) // Stack of nested form handlers for ButtonBar.
  const [ form, setForm ] = useState<createChampFormType>({
    champName: "",
    rounds: 24,
    series: null,
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
    inviteOnly: false,
  })
  const [ formErr, setFormErr ] = useState<createChampFormErrType>({
    series: "",
    champName: "",
    rounds: "",
    dropzone: "",
    pointsStructure: "",
    rulesAndRegs: "",
    champBadges: "",
  })

  const navigate = useNavigate()

  // Generate unique ID and push handler onto the stack.
  const pushHandlers = useCallback((handlers: Omit<FormHandlers, 'id'>): string => {
    const id = `handler-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const handlerWithId: FormHandlers = { ...handlers, id }
    setHandlerStack(prev => [...prev, handlerWithId])
    return id
  }, [])

  // Remove specific handler by ID from the stack.
  const popHandlers = useCallback((id: string) => {
    setHandlerStack(prev => prev.filter(h => h.id !== id))
  }, [])

  // Derive active handlers from the top of the stack.
  const activeFormHandlers = getActiveHandlers(handlerStack)

  // Memoized context value for ChampFlowProvider.
  const champFlowContextValue = useMemo(() => ({
    inChampFlow: true,
    handlerStack,
    pushHandlers,
    popHandlers,
  }), [handlerStack, pushHandlers, popHandlers])

  // Handles form submission - validates and creates the championship
  const onSubmitHandler = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    // Validate required fields before submission
    const validationError = validateChampForm(form)
    if (validationError) {
      setFormErr(prev => ({ ...prev, ...validationError }))
      return
    }

    // Call the createChamp API
    const champ = await createChamp(
      form,
      setForm,
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

  return (
  <ChampFlowProvider value={champFlowContextValue}>
    <form className="content-container create-champ" onSubmit={e => onSubmitHandler(e)}>
      <CreateChampHeader activeStep={activeStep}/>
        {activeStep === 0 &&
        <ChampBasicsCard
          form={form}
          setForm={setForm}
          formErr={formErr}
          setFormErr={setFormErr}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
        />
      }
      {activeStep === 1 &&
        <SeriesPicker
          form={form}
          setForm={setForm}
          formErr={formErr}
          setFormErr={setFormErr}
          seriesList={seriesList}
          setSeriesList={setSeriesList}
          user={user}
          setUser={setUser}
          backendErr={backendErr}
          setBackendErr={setBackendErr}
        />
      }
      {activeStep === 2 &&
        <RulesAndRegsPicker
          user={user}
          form={form}
          setForm={setForm}
          setFormErr={setFormErr}
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
          badgesReqSent={badgesReqSent}
          setBadgesReqSent={setBadgesReqSent}
          defaultBadges={defaultBadges}
          setDefaultBadges={setDefaultBadges}
          defaultsButton
        />
      }
      {activeStep === 4 &&
        <>
          <ChampCompleteCard
            backendErr={backendErr}
            formErr={formErr}
          />
          <Toggle
            text="Invite Only"
            checked={form.inviteOnly}
            onChange={(checked) => setForm(prev => ({ ...prev, inviteOnly: checked }))}
          />
        </>
      }
    </form>
    <ButtonBar
      background
      position="relative"
      buttons={[
        {
          label: "Back",
          onClick: () => activeFormHandlers
            ? activeFormHandlers.back()
            : setActiveStep(prevStep => prevStep - 1),
          startIcon: <ArrowBack />,
          color: "inherit",
          disabled: firstStep && !activeFormHandlers
        },
        ...(activeFormHandlers?.canDelete && activeFormHandlers?.isEditing ? [{
          label: "Delete",
          onClick: activeFormHandlers.onDelete,
          startIcon: <Delete />,
          color: "error" as const,
          loading: activeFormHandlers?.delLoading
        }] : []),
        {
          label: activeFormHandlers
            ? (activeFormHandlers.isEditing ? "Update" : "Submit")
            : (lastStep ? "Create Championship" : "Next"),
          onClick: () => activeFormHandlers
            ? activeFormHandlers.submit()
            : lastStep
              ? document.querySelector<HTMLFormElement>('form.create-champ')?.requestSubmit()
              : setActiveStep(prevStep => prevStep + 1),
          endIcon: (!activeFormHandlers && !lastStep && <Arrows />),
          loading: activeFormHandlers?.loading || loading
        }
      ]}
    />
  </ChampFlowProvider>
  )
}

export default CreateChamp
