"use client";

import Script from "next/script";
import { useEffect, useRef, useState } from "react";

import { apiBaseUrl } from "@/lib/api";
import { saveAuth, type AuthResponse } from "@/lib/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            element: HTMLElement,
            options: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              locale?: string;
            },
          ) => void;
        };
      };
    };
  }
}

type GoogleSignInButtonProps = {
  returnUrl: string;
  onError?: (message: string) => void;
};

export function GoogleSignInButton({
  returnUrl,
  onError,
}: GoogleSignInButtonProps) {
  const buttonRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "";

  useEffect(() => {
    if (!scriptReady || !clientId || !window.google || !buttonRef.current) {
      return;
    }

    const container = buttonRef.current;
    container.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: async ({ credential }) => {
        if (!credential) {
          onError?.("Google oturumu başlatılamadı.");
          return;
        }

        try {
          const response = await fetch(`${apiBaseUrl}/api/auth/social/google`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              idToken: credential,
            }),
          });

          const data = await response.json();

          if (!response.ok) {
            onError?.(data?.message ?? "Google ile giriş yapılamadı.");
            return;
          }

          saveAuth(data as AuthResponse);
          window.location.assign(returnUrl || "/");
        } catch {
          onError?.("Google ile giriş sırasında sunucuya bağlanılamadı.");
        }
      },
    });

    window.google.accounts.id.renderButton(container, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "rectangular",
      width: 360,
      locale: "tr",
    });
  }, [clientId, onError, returnUrl, scriptReady]);

  if (!clientId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        Google giriş yapılandırması eksik.
      </div>
    );
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setScriptReady(true)}
      />
      <div className="flex min-h-11 w-full justify-center">
        <div ref={buttonRef} />
      </div>
    </>
  );
}
