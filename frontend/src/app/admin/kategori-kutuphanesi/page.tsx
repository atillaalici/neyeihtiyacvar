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
 const [newCategory,setNewCategory]=useState("");
 const [newService,setNewService]=useState("");
 const [newPhrase,setNewPhrase]=useState("");
 const [bulkPhrases,setBulkPhrases]=useState("");
 const [bulkBusy,setBulkBusy]=useState(false);
 const [message,setMessage]=useState("");
 const token=typeof window!=="undefined"?getAccessToken():null;
 const headers:HeadersInit={"Content-Type":"application/json",...(token?{Authorization:`Bearer ${token}`}:{})};

 async function load(){
  const r=await fetch(`${apiBaseUrl}/api/admin/category-library`,{headers,cache:"no-store"});
  if(!r.ok){setMessage(`Kütüphane yüklenemedi (${r.status})`);return;}
  setData(await r.json());
 }
 useEffect(() => {
  let active = true;
  void (async () => {
   const r = await fetch(`${apiBaseUrl}/api/admin/category-library`, { headers, cache: "no-store" });
   if (!active) return;
   if (!r.ok) { setMessage(`Kütüphane yüklenemedi (${r.status})`); return; }
   setData(await r.json());
  })();
  return () => { active = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 const sortedCategories=useMemo(()=>[...data].sort((a,b)=>a.name.localeCompare(b.name,"tr-TR",{sensitivity:"base"})),[data]);
 const category=useMemo(()=>data.find(x=>x.id===categoryId),[data,categoryId]);
 const service=useMemo(()=>category?.services.find(x=>x.id===serviceId),[category,serviceId]);
  const sortedServices = useMemo(
    () =>
      [...(category?.services ?? [])].sort((a, b) =>
        a.name.localeCompare(b.name, "tr-TR", { sensitivity: "base" }),
      ),
    [category],
  );
 const phrases=useMemo(()=>service?.works.flatMap(w=>w.phrases)??[],[service]);

 async function req(url:string,options:RequestInit){
  const r=await fetch(`${apiBaseUrl}${url}`,{...options,headers});
  if(!r.ok)throw new Error((await r.text())||`İşlem başarısız (${r.status})`);
  return r;
 }
 async function addCategory(){
  const name=newCategory.trim(); if(!name)return;
  try{
   const r=await req("/api/admin/category-library/categories",{method:"POST",body:JSON.stringify({name})});
   const created=await r.json() as {id:string;name:string};
   setNewCategory(""); setCategoryId(created.id); setServiceId("");
   setMessage(`"${created.name}" ana kategorisi eklendi.`); await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Ana kategori eklenemedi.");}
 }
 async function delCategory(){
  if(!categoryId||!category)return;
  if(category.services.length>0){
   setMessage(`"${category.name}" kategorisinde ${category.services.length} aktif hizmet var. Önce hizmetleri silmelisiniz.`);
   return;
  }
  if(!confirm(`"${category.name}" ana kategorisi silinsin mi?`))return;
  try{
   await req(`/api/admin/category-library/categories/${categoryId}`,{method:"DELETE"});
   setCategoryId(""); setServiceId(""); setMessage("Ana kategori silindi."); await load();
  }catch(e){setMessage(e instanceof Error?e.message:"Ana kategori silinemedi.");}
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

 async function addBulkPhrases(){
  if(!serviceId||!bulkPhrases.trim())return;
  const items=bulkPhrases.split(/\r?\n/).map(x=>x.trim()).filter(Boolean);
  if(items.length===0)return;
  setBulkBusy(true);
  try{
   const r=await req(`/api/admin/category-library/services/${serviceId}/phrases/bulk`,{method:"POST",body:JSON.stringify({phrases:items})});
   const result=await r.json() as {added:number;skipped:number;valid:number};
   setBulkPhrases("");
   setMessage(`${result.added} kullanıcı cümlesi eklendi.${result.skipped>0?` ${result.skipped} tekrar kayıt atlandı.`:""}`);
   await load();
  }
  catch(e){setMessage(e instanceof Error?e.message:"Toplu cümleler eklenemedi.");}
  finally{setBulkBusy(false);}
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
    <label className="mt-6 block"><b className="mb-2 block text-sm">Ana Kategori</b><select className="h-12 w-full rounded-xl border bg-background px-4" value={categoryId} onChange={e=>{setCategoryId(e.target.value);setServiceId("");}}><option value="">Kategori seçin</option>{sortedCategories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
    <div className="mt-4 rounded-xl border bg-muted/20 p-3">
     <h3 className="font-bold">Ana Kategori Ekle</h3>
     <div className="mt-3 flex gap-2"><input className="h-11 min-w-0 flex-1 rounded-xl border bg-background px-3" value={newCategory} onChange={e=>setNewCategory(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")void addCategory();}} placeholder="Yeni ana kategori adı"/><button onClick={()=>void addCategory()} disabled={!newCategory.trim()} className="rounded-xl bg-primary px-4 font-semibold text-primary-foreground disabled:opacity-40">Ekle</button></div>
     <button onClick={()=>void delCategory()} disabled={!categoryId} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-red-200 font-semibold text-red-600 disabled:opacity-40"><Trash2 className="size-4"/> Seçili Ana Kategoriyi Sil</button>
     {category&&category.services.length>0&&<p className="mt-2 text-xs text-muted-foreground">Bu kategoride {category.services.length} aktif hizmet var. Silmek için önce hizmetleri silmelisiniz.</p>}
    </div>
    <label className="mt-4 block"><b className="mb-2 block text-sm">Hizmet</b><select className="h-12 w-full rounded-xl border bg-background px-4" value={serviceId} disabled={!category} onChange={e=>setServiceId(e.target.value)}><option value="">Hizmet seçin</option>{sortedServices.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select></label>
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

     <div className="my-6 border-t"/>
     <h3 className="font-bold">Toplu Kullanıcı Cümlesi Ekle</h3>
     <p className="mt-1 text-sm text-muted-foreground">Her satıra bir kullanıcı cümlesi yazın veya Excel&apos;den tek sütun halinde yapıştırın.</p>
     <textarea className="mt-3 min-h-[230px] w-full resize-y rounded-xl border bg-background px-4 py-3 text-sm leading-6" value={bulkPhrases} onChange={e=>setBulkPhrases(e.target.value)} placeholder={"Sigorta sürekli atıyor\nElektrikler sürekli kesiliyor\nEvde elektrik yok\nPrizde elektrik yok"}/>
     <div className="mt-2 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>Boş satırlar ve tekrar eden cümleler otomatik atlanır.</span><span>{bulkPhrases.split(/\r?\n/).filter(x=>x.trim()).length} satır</span></div>
     <button onClick={()=>void addBulkPhrases()} disabled={bulkBusy||!bulkPhrases.trim()} className="mt-3 h-12 w-full rounded-xl bg-primary px-5 font-semibold text-primary-foreground disabled:opacity-50">{bulkBusy?"Ekleniyor...":"Tümünü Ekle"}</button>

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