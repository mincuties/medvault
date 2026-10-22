"use client";
import Link from "next/link";
import { useTideCloak } from "@tidecloak/nextjs";

export default function Shell({ title, children }) {
  const { authenticated, logout, getValueFromToken } = useTideCloak();
  return (
    <main>
      <header>
        <h1><Link href="/" style={{ color: "inherit", textDecoration: "none" }}>Med<span>Vault</span></Link>{title ? ` · ${title}` : ""}</h1>
        {authenticated && (
          <div className="row">
            <span className="muted">{getValueFromToken("preferred_username")}</span>
            <button className="secondary" onClick={() => logout()}>Log out</button>
          </div>
        )}
      </header>
      {children}
    </main>
  );
}
