"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTideCloak } from "@tidecloak/nextjs";

export default function Redirect() {
  const { authenticated, isInitializing } = useTideCloak();
  const router = useRouter();
  useEffect(() => {
    if (!isInitializing) router.push("/");
  }, [authenticated, isInitializing, router]);
  return <main><p>Loading...</p></main>;
}
