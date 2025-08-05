import { PublicBookingPage } from "@/components/public-booking/public-booking-page"

interface BookingPageProps {
  params: {
    organizationId: string
  }
}

export default function BookingPage({ params }: BookingPageProps) {
  return <PublicBookingPage organizationId={params.organizationId} />
}
