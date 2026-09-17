"use client";
import {useEffect,useState} from "react";
import {usePathname,useSearchParams} from "next/navigation";
import Script from "next/script";
import {trackEvent} from "@/lib/analytics";
const measurementId=process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID;
const KEY="niv_cookie_consent",EVENT="niv-cookie-consent-change";
function allowed(){try{const r=localStorage.getItem(KEY);return !!r&&JSON.parse(r).analytics===true}catch{return false}}
function AnalyticsEvents(){
 const pathname=usePathname(),searchParams=useSearchParams();
 useEffect(()=>{const q=searchParams.toString();trackEvent("page_view",{page_path:q?`${pathname}?${q}`:pathname});
 if(pathname==="/kesfet"){const s=searchParams.get("q")||searchParams.get("ihtiyac");if(s)trackEvent("search",{search_term:s})}
 if(pathname.startsWith("/isletme/"))trackEvent("view_provider",{provider_slug:pathname.split("/").filter(Boolean).at(-1)})},[pathname,searchParams]);
 useEffect(()=>{const click=(e:MouseEvent)=>{const t=e.target;if(!(t instanceof Element))return;const l=t.closest("a");if(!l)return;const h=l.getAttribute("href")||"";
 if(h.startsWith("tel:"))trackEvent("contact_click",{method:"phone"});else if(h.includes("wa.me/")||h.includes("whatsapp.com/"))trackEvent("contact_click",{method:"whatsapp"});else if(h==="/isletme-ekle"||h.startsWith("/kayit?hesap=isletme"))trackEvent("provider_registration_start");else if(h.startsWith("/uyelik/odeme"))trackEvent("begin_checkout")};
 document.addEventListener("click",click);return()=>document.removeEventListener("click",click)},[]);return null
}
export function GoogleAnalytics(){
 const [ok,setOk]=useState(false);
 useEffect(()=>{const sync=()=>setOk(!!measurementId&&allowed());sync();window.addEventListener(EVENT,sync);window.addEventListener("storage",sync);return()=>{window.removeEventListener(EVENT,sync);window.removeEventListener("storage",sync)}},[]);
 if(!measurementId||!ok)return null;
 return <><Script src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`} strategy="afterInteractive"/><Script id="google-analytics" strategy="afterInteractive">{`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}window.gtag=gtag;gtag('js',new Date());gtag('config','${measurementId}',{anonymize_ip:true,send_page_view:false});`}</Script><AnalyticsEvents/></>
}
