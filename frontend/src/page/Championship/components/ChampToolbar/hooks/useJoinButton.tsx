import React, { useState, useCallback, useMemo } from "react"
import { NavigateFunction } from "react-router-dom"
import { GroupAdd, Lock, Block, CheckCircle } from "@mui/icons-material"
import { CircularProgress } from "@mui/material"
import { ButtonConfig } from "../../../../../components/utility/buttonBar/ButtonBar"
import { ChampType } from "../../../../../shared/types"
import { userType } from "../../../../../shared/localStorage"
import { graphQLErrorType } from "../../../../../shared/requests/requestsUtility"
import { joinChamp } from "../../../../../shared/requests/champRequests"
import { ChampView } from "../../../Views/ChampSettings/ChampSettings"

interface UseJoinButtonProps {
  champ: ChampType
  setChamp: React.Dispatch<React.SetStateAction<ChampType | null>>
  user: userType
  setUser: React.Dispatch<React.SetStateAction<userType>>
  navigate: NavigateFunction
  setBackendErr: React.Dispatch<React.SetStateAction<graphQLErrorType>>
  navigateToView?: (view: ChampView) => void
  setShowInviteFullConfirm?: React.Dispatch<React.SetStateAction<boolean>>
  setShowAcceptInviteFullConfirm?: React.Dispatch<React.SetStateAction<boolean>>
  onJoinSuccess?: () => void
}

interface UseJoinButtonReturn {
  buttonConfig: ButtonConfig | undefined
  joiningChamp: boolean
}

// Encapsulates the complex join/invite button logic with all edge cases.
export const useJoinButton = ({
  champ,
  setChamp,
  user,
  setUser,
  navigate,
  setBackendErr,
  navigateToView,
  setShowInviteFullConfirm,
  setShowAcceptInviteFullConfirm,
  onJoinSuccess,
}: UseJoinButtonProps): UseJoinButtonReturn => {
  const [joiningChamp, setJoiningChamp] = useState(false)

  // Pre-compute user states.
  const isCompetitor = useMemo(
    () => champ.competitors.some((c) => c._id === user._id),
    [champ.competitors, user._id]
  )

  const isAdjudicator = useMemo(
    () => champ.adjudicator?.current?._id === user._id,
    [champ.adjudicator, user._id]
  )

  const isBanned = useMemo(
    () => champ.banned?.some((b) => b._id === user._id),
    [champ.banned, user._id]
  )

  const isInvited = useMemo(
    () => champ.invited?.some((i) => i._id === user._id),
    [champ.invited, user._id]
  )

  const isFull = useMemo(
    () => champ.competitors.length >= champ.settings.maxCompetitors,
    [champ.competitors.length, champ.settings.maxCompetitors]
  )

  // Handle joining a championship.
  const handleJoin = useCallback(async () => {
    setJoiningChamp(true)
    const success = await joinChamp(
      champ._id,
      setChamp,
      user,
      setUser,
      navigate,
      setBackendErr
    )
    setJoiningChamp(false)
    if (success && onJoinSuccess) {
      onJoinSuccess()
    }
  }, [
    champ._id,
    setChamp,
    user,
    setUser,
    navigate,
    setBackendErr,
    onJoinSuccess,
  ])

  // Build button config based on championship and user state.
  const buttonConfig = useMemo((): ButtonConfig | undefined => {
    // Banned users see disabled "You are banned" button.
    if (isBanned) {
      return {
        label: "You are banned",
        endIcon: <Block />,
        color: "error",
        disabled: true,
      }
    }

    // Open championships (not invite only).
    if (!champ.settings.inviteOnly) {
      // Competitors and adjudicator can invite others in open championships.
      if (isCompetitor || isAdjudicator) {
        return {
          label: "Invite Competitors",
          onClick: () => {
            if (isFull && setShowInviteFullConfirm) {
              setShowInviteFullConfirm(true)
            } else if (navigateToView) {
              navigateToView("invite")
            }
          },
          endIcon: <GroupAdd />,
          color: "success",
        }
      }

      if (isFull) {
        return {
          label: "Championship Full",
          endIcon: <Block />,
          disabled: true,
        }
      }

      return {
        label: "Join Championship",
        onClick: handleJoin,
        endIcon: joiningChamp ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <GroupAdd />
        ),
        color: "success",
      }
    }

    // Invite-only championships.

    // Adjudicator sees "Invite Competitors" button.
    if (isAdjudicator) {
      return {
        label: "Invite Competitors",
        onClick: () => {
          if (isFull && setShowInviteFullConfirm) {
            setShowInviteFullConfirm(true)
          } else if (navigateToView) {
            navigateToView("invite")
          }
        },
        endIcon: <GroupAdd />,
        color: "success",
      }
    }

    // Invited users see "Accept Invite" button.
    if (isInvited) {
      return {
        label: "Accept Invite",
        onClick: async () => {
          if (isFull && setShowAcceptInviteFullConfirm) {
            setShowAcceptInviteFullConfirm(true)
          } else {
            await handleJoin()
          }
        },
        endIcon: joiningChamp ? (
          <CircularProgress size={16} color="inherit" />
        ) : (
          <CheckCircle />
        ),
        color: "success",
      }
    }

    // Already a competitor - no button.
    if (isCompetitor) return undefined

    // Non-invited users see disabled "Invite Only" button.
    return {
      label: "Invite Only",
      endIcon: <Lock />,
      disabled: true,
    }
  }, [
    isBanned,
    isCompetitor,
    isFull,
    isAdjudicator,
    isInvited,
    joiningChamp,
    champ.settings.inviteOnly,
    handleJoin,
    navigateToView,
    setShowInviteFullConfirm,
    setShowAcceptInviteFullConfirm,
  ])

  return { buttonConfig, joiningChamp }
}
