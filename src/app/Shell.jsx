"use client";
import Link from "next/link";
import { useTideCloak } from "@tidecloak/nextjs";

export default function Shell({ title, children }) {
  const { authenticated, isInitializing, login, logout, getValueFromIdToken } = useTideCloak();
  let body = children;
  if (isInitializing) body = <p className="muted">Loading...</p>;
  else if (!authenticated) body = <div className="card"><p>Please log in.</p><button onClick={() => login()}>Login with TideCloak</button></div>;
  return (
    <main>
      <header>
        <h1><Link href="/" className="brand">Med<span>Vault</span></Link>{title ? <small> · {title}</small> : null}</h1>
        {authenticated && (
          <div className="row">
            <span className="muted">{getValueFromIdToken("preferred_username")}</span>
            <button className="secondary" onClick={() => logout()}>Log out</button>
          </div>
        )}
      </header>
      {body}
    </main>
  );
}
