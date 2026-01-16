import React from "react"
import "./_admin.scss"
import MUISwitch from "../../../../components/utility/muiSwitch/MUISwitch"

// Form type for admin settings.
export interface AdminFormType {
  adjCanSeeBadges: boolean
}

// Form error type for admin settings.
export interface AdminFormErrType {
  [key: string]: string
}

interface AdminProps {
  adminForm: AdminFormType
  setAdminForm: React.Dispatch<React.SetStateAction<AdminFormType>>
}

// Admin-only view for managing admin settings.
const Admin: React.FC<AdminProps> = ({
  adminForm,
  setAdminForm,
}) => {
  return (
    <div className="admin-view">
      <MUISwitch
        text="Adj Can See Hidden Badges"
        fullWidth
        checked={adminForm.adjCanSeeBadges}
        onChange={(checked) => setAdminForm(prev => ({ ...prev, adjCanSeeBadges: checked }))}
      />
    </div>
  )
}

export default Admin
