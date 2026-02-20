import React from "react"
import { SvgIconProps } from "@mui/material"
import { SocialEventPayload } from "../../../../shared/socialTypes"

// Content area styling applied via inline styles from config.
export interface EventContentStyle {
  borderSide?: "left" | "top"
  borderColor: string
  background?: string
}

// Per-event-kind configuration driving the SocialEventCard layout.
export interface SocialEventConfig {
  title: string                                                    // Static title (e.g. "Round Victory")
  getTitle?: (payload: SocialEventPayload) => string               // Dynamic override (e.g. "Epic Badge Win")
  Icon: React.ComponentType<SvgIconProps>                          // MUI icon component
  iconColor: string                                                // Hex color for icon
  getText: (name: string, payload: SocialEventPayload) => string   // Descriptive text builder
  contentStyle?: EventContentStyle                                 // Border/background for content area
  layout: "default" | "badge" | "victory" | "champion" | "runner-up" | "streak" | "perfect"
  useChampIcon?: boolean                                           // Show champ icon from payload if available
  showcase?: {                                                     // Hero/subtitle text for showcase layouts
    getHeroText: (payload: SocialEventPayload) => string
    getSubtitle?: (payload: SocialEventPayload) => string | undefined
  }
}
