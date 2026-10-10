import { redirect } from "next/navigation";

// The studio is the creator's home ("/") now. Kept so old links still land.
export default function StudioPage() {
  redirect("/");
}
