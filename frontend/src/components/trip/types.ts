export type ActivityType = 'visit' | 'meal' | 'transport' | 'shopping' | 'other'

export interface TripDayActivityDetails {
  startTime: string
  endTime: string
  type: ActivityType
  details: string
  cost: number
}

export interface TripDayDetails {
  day: number
  date: string
  cities: string[]
  activities: TripDayActivityDetails[]
}

export interface TripPlanDetails {
  countries: string[]
  dayPlans: TripDayDetails[]
}

export interface TripFormSubmitPayload {
  name: string
  country: string
  startDate: string
  endDate: string
  budget: number
  details: TripPlanDetails
}
