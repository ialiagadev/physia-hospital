import { redirect } from "next/navigation"

// Cambiar la redirección para ir directamente al dashboard en lugar del login
export default function Home() {
  redirect("/dashboard")
}
