"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { AdminNav } from "@/components/admin/AdminNav";
import { SiteLayout } from "@/components/site/SiteLayout";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

type Phrase={id:string;phrase:string;isActive:boolean};
type Work={id:string;name:string;sortOrder:number;isActive:boolean;phrases:Phrase[]};
type Service={id:string;name:string;works:Work[]};
type Category={id:string;name:string;slug:string;services:Service[]};

export default function CategoryLibraryPage(){
 const [data,setData]=useState<Category[]>([]);
 const [categoryId,setCategoryId]=useState("");
 const [serviceId,setServiceId]=useState("");
 const [newService,setNewService]=useState("");
 const [newPhrase,setNewPhrase]=useState("");
 const [message,setMessage]=useState("");
 const token=typeof window!=="undefined"?getAccessToken():null;
 const headers:HeadersInit={"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})};

 async function load(){
  const r=await fetch(`${apiBaseUrl}/api/admin/category-library`,{headers,cache:"no-store"});
  if(!r.ok){setMessage(`Kütüphane yüklenemedi (${r.status})`);return;}
  setData(await r.json());
 }
 useEffect(()=>{void load();},[]);
 const category=useMemo(()=>data.find(x=>x.id===categoryId),[data,categoryId]);
 const service=useMemo(()=>category?.services.find(x=>x.id===serviceId),[category,serviceId]);
 const phrases=useMemo(()=>service?.works.flatMap(w=>w.phrases)??[],[service]);

 async function req(url:string,options:RequestInit){
  const r=await fetch(`${apiBaseUrl}${url}`,{...options,headers});
  if(!r.ok)throw new Error((await r.text())||`İşlem başarısız (${r.status})`);
  return r;
 }
 async function addService(){
  if(!categoryId||!newService.trim())return;
  try{await req("/api/admin/category-library/services",{method:"POST",body:JSON.stringify({categoryId,name:newService.trim()})});setNewService("");setMessage("Hizmet eklendi.");await load();}
  catch(e){setMessage(e instanceof Error?e.message:"Hizmet eklenemedi.");}
 }
 async function delService(){
  if(!serviceId||!service||!confirm(`"${service.name}" hizmeti silinsin mi?`))return;
  try{await req(`/api/admin/category-library/services/${serviceId}`,{method:"DELETE"});setServiceId("");setMessage("Hizmet silindi.");await load();}
  catch(e){setMessage(e instanceof Error?e.message:"Hizmet silinemedi.");}
 }
 async function addPhrase(){
  if(!serviceId||!newPhrase.trim())return;
  try{await req(`/api/admin/category-library/services/${serviceId}/phrases`,{method:"POST",body:JSON.stringify({phrase:newPhrase.trim()})});setNewPhrase("");setMessage("Kullanıcı cümlesi eklendi.");await load();}
  catch(e){setMessage(e instanceof Error?e.message:"Cümle eklenemedi.");}
 }
 async function delPhrase(id:string){
  try{await req(`/api/admin/category-library/phrases/${id}`,{method:"DELETE"});setMessage("Kullanıcı cümlesi silindi.");await load();}
  catch(e){setMessage(e instanceof Error?e.message:"Cümle silinemedi.");}
 }


 return <SiteLayout><AdminNav/><section className="section-shell py-6 sm:py-8">
  <div className="mb-5"><h1 className="font-display text-3xl font-bold">Kategori Kütüphanesi</h1><p className="mt-1 text-muted-foreground">Ana Kategori → Hizmet → Kullanıcı Cümlesi</p></div>
  {message&&<div className="mb-4 rounded-xl border bg-card px-4 py-3 text-sm">{message}</div>}
  <div className="grid gap-4 lg:grid-cols-3">

   <section className="min-h-[700px] rounded-2xl border bg-card p-5">
    <div className="flex items-center gap-3"><b className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">1</b><h2 className="text-lg font-bold">Kategori ve Hizmet</h2></div>
    <label className="mt-6 block"><b className="mb-2 block text-sm">Ana Kategori</b><select className="h-12 w-full rounded-xl border bg-background px-4" value={categoryId} onChange={e=>{setCategoryId(e.target.value);setServiceId("");}}><option value="">Kategori seçin</option>{data.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <label className="mt-4 block"><b className="mb-2 block text-sm">Hizmet</b><select className="h-12 w-full rounded-xl border bg-background px-4" value={serviceId} disabled={!category} onChange={e=>setServiceId(e.target.value)}><option value="">Hizmet seçin</option>{category?.services.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <div className="my-5 border-t"/><h3 className="font-bold">Hizmet Ekle</h3>
    <div className="mt-3 flex gap-2"><input className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-4" value={newService} disabled={!categoryId} onChange={e=>setNewService(e.target.value)} placeholder="Yeni hizmet adı"/><button onClick={()=>void addService()} className="rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Ekle</button></div>
    <button onClick={()=>void delService()} disabled={!serviceId} className="mt-4 flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-red-200 font-semibold text-red-600 disabled:opacity-40"><Trash2 className="size-4"/> Seçili Hizmeti Sil</button>
   </section>

   <section className="min-h-[700px] rounded-2xl border bg-card p-5">
    <div className="flex items-center gap-3"><b className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">2</b><h2 className="text-lg font-bold">Kullanıcı Cümleleri</h2></div>
    {!service?<div className="mt-6 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Önce hizmet seçin.</div>:<>
     <div className="mt-6 rounded-xl border bg-muted/20 px-4 py-3 text-sm">Seçili Hizmet: <strong>{service.name}</strong></div>
<h3 className="font-bold">Kullanıcı Cümlesi Ekle</h3>
     <div className="mt-3 flex gap-2"><input className="h-12 min-w-0 flex-1 rounded-xl border bg-background px-4" value={newPhrase} onChange={e=>setNewPhrase(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void addPhrase();}} placeholder="Örn. sigorta sürekli atıyor"/><button onClick={()=>void addPhrase()} className="rounded-xl bg-primary px-5 font-semibold text-primary-foreground">Ekle</button></div>
     <div className="mt-5 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">Bu cümleler seçili hizmetin arama eşleşmelerinde kullanılacaktır.</div>
    </>}
   </section>

   <section className="min-h-[700px] rounded-2xl border bg-card p-5">
    <div className="flex items-center gap-3"><b className="grid size-9 place-items-center rounded-full bg-primary text-primary-foreground">3</b><h2 className="text-lg font-bold">Mevcut Kullanıcı Cümleleri</h2></div>
    {!service?<div className="mt-6 rounded-xl border border-dashed p-5 text-sm text-muted-foreground">Önce hizmet seçin.</div>:<>
     <h3 className="mt-6 font-bold">Mevcut Kullanıcı Cümleleri ({phrases.length})</h3>
     <div className="mt-3 max-h-[520px] space-y-2 overflow-y-auto pr-1">{phrases.length===0?<div className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">Bu hizmete henüz kullanıcı cümlesi eklenmedi.</div>:phrases.map(p=><div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border bg-background px-4 py-3"><span className="text-sm">{p.phrase}</span><button onClick={()=>void delPhrase(p.id)} className="grid size-7 shrink-0 place-items-center rounded-full text-lg font-bold text-red-500 hover:bg-red-50" title="Cümleyi kaldır">×</button></div>)}</div>
    </>}
   </section>

  </div>
 </section></SiteLayout>;
}