import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function NewBoard() {
  await auth.protect();
  redirect(`/room/${crypto.randomUUID().slice(0, 8)}`);
}
