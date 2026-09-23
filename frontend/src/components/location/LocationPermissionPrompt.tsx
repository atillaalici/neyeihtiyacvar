"use client";
import {useEffect,useState} from "react";
const KEY="niv_location_preference";
export function LocationPermissionPrompt(){
 const [show,setShow]=useState(false),[busy,setBusy]=useState(false);
 useEffect(()=>{const timer=window.setTimeout(()=>{try{if(!localStorage.getItem(KEY))setShow(true)}catch{}},0);return()=>window.clearTimeout(timer)},[]);
 const later=()=>{localStorage.setItem(KEY,"later");setShow(false)};
 const allow=()=>{if(!navigator.geolocation){localStorage.setItem(KEY,"unsupported");setShow(false);return}
 setBusy(true);navigator.geolocation.getCurrentPosition(p=>{
   localStorage.setItem("niv_current_location",JSON.stringify({latitude:p.coords.latitude,longitude:p.coords.longitude,accuracy:p.coords.accuracy,updatedAt:Date.now()}));
   localStorage.setItem(KEY,"allowed");setBusy(false);setShow(false);
 },()=>{localStorage.setItem(KEY,"denied");setBusy(false);setShow(false)},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})};
 if(!show)return null;
 return <div className="fixed inset-x-3 bottom-3 z-[90] mx-auto max-w-md rounded-2xl border border-border bg-card p-5 shadow-2xl sm:left-auto sm:right-5 sm:mx-0">
  <div className="text-lg font-bold">📍 Yakınındaki hizmetleri bulalım</div>
  <p className="mt-2 text-sm leading-6 text-muted-foreground">Konum izni verirsen sana yakın işletmeleri ve hizmetleri göstermek için mevcut konumunu kullanabiliriz. Konumun bu izinle kalıcı olarak veritabanına kaydedilmez.</p>
  <div className="mt-4 flex gap-2"><button onClick={later} className="flex-1 rounded-lg border px-3 py-2 text-sm font-semibold">Şimdi Değil</button><button onClick={allow} disabled={busy} className="flex-1 rounded-lg bg-orange-500 px-3 py-2 text-sm font-bold text-white">{busy?"Konum alınıyor...":"Konumumu Kullan"}</button></div>
 </div>
}
