import { ToolbarStrategy, ToolbarContext, ToolbarConfig, ViewMode, FormToolbarProps } from "../types"
import { createBackButton, createSaveButton, createViewsButton } from "./baseConfigs"
import { ChampView } from "../../../Views/ChampSettings/ChampSettings"

// Maps form view names to their corresponding props key.
const formViewMapping: Record<string, string> = {
  settings: "settingsProps",
  series: "settingsProps",
  automation: "automationProps",
  protests: "protestsProps",
  ruleChanges: "ruleChangesProps",
  admin: "adminProps",
}

// List of all form views.
const formViews: ChampView[] = ["settings", "series", "automation", "protests", "ruleChanges", "admin"]

// Checks if a view is a form view.
export const isFormView = (view: ChampView): boolean => {
  return formViews.includes(view)
}

// Strategy for form views (settings, series, automation, protests, ruleChanges, admin).
export const formViewStrategy: ToolbarStrategy = {
  getConfig(
    context: ToolbarContext,
    _mode: ViewMode,
    props?: Record<string, FormToolbarProps | undefined>
  ): ToolbarConfig {
    const propsKey = formViewMapping[context.view]
    const formProps = props?.[propsKey]

    // Disable save button if no changes or form has errors.
    const isSaveDisabled =
      !formProps?.loading &&
      (!formProps?.changed || Object.values(formProps?.formErr || {}).some((err) => !!err))

    return {
      buttons: [
        createBackButton(context.onBack),
        createSaveButton(formProps?.onSubmit, isSaveDisabled, formProps?.loading),
        createViewsButton(context.onDrawerClick),
      ],
    }
  },

  getMode(): ViewMode {
    return "browse"
  },
}
