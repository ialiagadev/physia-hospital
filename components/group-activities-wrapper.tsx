"use client"

import { GroupActivitiesProvider } from "@/app/contexts/group-activities-context"
import { GroupActivitiesView } from "./group-activities/group-activities-view"

interface GroupActivitiesWrapperProps {
  organizationId: number
  users: any[]
}

export function GroupActivitiesWrapper({ organizationId, users }: GroupActivitiesWrapperProps) {
  return (
    <GroupActivitiesProvider organizationId={organizationId} users={users}>
      <GroupActivitiesView organizationId={organizationId} users={users} />
    </GroupActivitiesProvider>
  )
}
