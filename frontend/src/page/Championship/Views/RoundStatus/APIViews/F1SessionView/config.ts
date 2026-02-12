import F1SessionView from "./F1SessionView"
import DemoSessionPicker from "./DemoSessionPicker/DemoSessionPicker"
import { SeriesConfig } from "../types"

// F1 series configuration — bundles the session view and demo picker.
export const f1Config: SeriesConfig = {
  View: F1SessionView,
  DemoPicker: DemoSessionPicker,
}
