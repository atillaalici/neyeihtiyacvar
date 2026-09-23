"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
const KEY="niv_cookie_consent", EVENT="niv-cookie-consent-change";
export function CookieConsent(){
 const [show,setShow]=useState(false),[manage,setManage]=useState(false),[analytics,setAnalytics]=useState(false);
 useEffect(()=>{
  const timer=window.setTimeout(()=>{try{const r=localStorage.getItem(KEY);if(!r)setShow(true);else setAnalytics(JSON.parse(r).analytics===true)}catch{setShow(true)}},0);
  const open=()=>{try{const r=localStorage.getItem(KEY);if(r)setAnalytics(JSON.parse(r).analytics===true)}catch{}setManage(true);setShow(true)};
  window.addEventListener("niv-open-cookie-settings",open);return()=>{window.clearTimeout(timer);window.removeEventListener("niv-open-cookie-settings",open)}},[]);
 const save=(a:boolean)=>{localStorage.setItem(KEY,JSON.stringify({necessary:true,analytics:a,updatedAt:new Date().toISOString()}));window.dispatchEvent(new Event(EVENT));setShow(false);setManage(false)};
 if(!show)return null;
 return <div className="fixed inset-x-0 bottom-0 z-[100] p-3 sm:p-5"><div className="mx-auto max-w-5xl rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7">
 <h2 className="text-xl font-extrabold text-slate-950">Gizliliğinize Önem Veriyoruz</h2>
 <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Neye İhtiyaç Var, sitenin güvenli ve doğru çalışması için zorunlu teknolojileri kullanır. İzniniz halinde kullanım istatistiklerini ölçmek ve hizmetlerimizi geliştirmek için analitik teknolojilerden yararlanır. Tercihinizi dilediğiniz zaman değiştirebilirsiniz.</p>
 <Link href="/cerez-politikasi" className="mt-2 inline-block text-sm font-semibold text-orange-600 hover:underline">Çerez Politikası</Link>
 {manage&&<div className="mt-5 grid gap-3 rounded-2xl bg-slate-50 p-4">
  <div className="flex items-center justify-between gap-4"><div><b>Zorunlu</b><p className="text-xs text-slate-500">Temel site işlevleri. Kapatılamaz.</p></div><span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-bold text-white">Her zaman açık</span></div>
  <div className="flex items-center justify-between gap-4 border-t pt-3"><div><b>Analitik / İstatistik</b><p className="text-xs text-slate-500">Google Analytics kullanım ölçümü.</p></div><button type="button" role="switch" aria-checked={analytics} onClick={()=>setAnalytics(v=>!v)} className={`relative h-7 w-12 rounded-full ${analytics?"bg-orange-500":"bg-slate-300"}`}><span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${analytics?"left-6":"left-1"}`}/></button></div>
 </div>}
 <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
  <button onClick={()=>setManage(true)} className="rounded-xl border px-5 py-3 text-sm font-bold">Çerezleri Yönet</button>
  <button onClick={()=>save(false)} className="rounded-xl border border-slate-900 px-5 py-3 text-sm font-bold">Tümünü Reddet</button>
  <button onClick={()=>save(manage?analytics:true)} className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white">{manage?"Tercihlerimi Kaydet":"Tümünü Kabul Et"}</button>
 </div></div></div>
}
export function CookieSettingsButton(){return <button type="button" onClick={()=>window.dispatchEvent(new Event("niv-open-cookie-settings"))} className="font-semibold text-orange-600 hover:underline">Çerez Tercihlerimi Değiştir</button>}
