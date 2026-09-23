"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Building2, LocateFixed, MapPin, Save, Tags } from "lucide-react";
import { apiBaseUrl } from "@/lib/api";
import { getAccessToken } from "@/lib/auth";

const BusinessLocationMap = dynamic(
  () => import("@/components/location/BusinessLocationMap"),
  { ssr: false },
);

type District = { id: string; name: string; slug: string };
type City = { id: string; name: string; slug: string; districts: District[] };
type Category = { id: string; name: string; slug: string; services: string[] };
type ProviderProfile = {
  id: string; businessName: string; description?: string | null;
  categorySlug?: string | null; serviceSlug?: string | null;
  additionalServices?: string[]; publicPhone?: string | null;
  publicWhatsapp?: string | null; publicAddress?: string | null;
  citySlug?: string | null; districtSlug?: string | null;
  latitude?: number | null; longitude?: number | null; version: number;
};

function slugify(v: string) {
  return v.trim().toLocaleLowerCase("tr-TR")
    .replaceAll("ı","i").replaceAll("ğ","g").replaceAll("ü","u")
    .replaceAll("ş","s").replaceAll("ö","o").replaceAll("ç","c")
    .replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");
}
function categoryAlias(v?: string | null) {
  return ["nakliye-tasima","nakliye-hafriyat","hafriyat-nakliyat","hafriyat-ve-nakliyat","insaat-hafriyat"].includes(v ?? "")
    ? "nakliye-ve-hafriyat" : (v ?? "");
}
function serviceAlias(v?: string | null) { return v === "hafriyat" ? "hafriyat-isleri" : (v ?? ""); }

export default function BusinessAccountManager() {
  const [profile,setProfile]=useState<ProviderProfile|null>(null);
  const [cities,setCities]=useState<City[]>([]);
  const [categories,setCategories]=useState<Category[]>([]);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState("");
  const [locating,setLocating]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  const [businessName,setBusinessName]=useState("");
  const [description,setDescription]=useState("");
  const [publicPhone,setPublicPhone]=useState("");
  const [publicWhatsapp,setPublicWhatsapp]=useState("");
  const [categorySlug,setCategorySlug]=useState("");
  const [serviceSlug,setServiceSlug]=useState("");
  const [secondCategorySlug,setSecondCategorySlug]=useState("");
  const [secondServiceSlug,setSecondServiceSlug]=useState("");
  const [publicAddress,setPublicAddress]=useState("");
  const [citySlug,setCitySlug]=useState("");
  const [districtSlug,setDistrictSlug]=useState("");
  const [latitude,setLatitude]=useState<number|null>(null);
  const [longitude,setLongitude]=useState<number|null>(null);

  const selectedCity=useMemo(()=>cities.find(x=>x.slug===citySlug)??null,[cities,citySlug]);
  const selectedCategory=useMemo(()=>categories.find(x=>x.slug===categorySlug)??null,[categories,categorySlug]);
  const selectedSecondCategory=useMemo(()=>categories.find(x=>x.slug===secondCategorySlug)??null,[categories,secondCategorySlug]);

  useEffect(()=>{
    let active=true;
    async function load(){
      const token=getAccessToken();
      if(!token){setLoading(false);return;}
      try{
        const [pr,lr,cr]=await Promise.all([
          fetch(`${apiBaseUrl}/api/provider-panel/me`,{headers:{Authorization:`Bearer ${token}`},cache:"no-store"}),
          fetch(`${apiBaseUrl}/api/locations`,{cache:"no-store"}),
          fetch(`${apiBaseUrl}/api/categories`,{cache:"no-store"})
        ]);
        if(!pr.ok||!lr.ok||!cr.ok) throw new Error("Hesap bilgileri yüklenemedi.");
        const p=await pr.json() as ProviderProfile;
        const l=await lr.json() as City[];
        const c=await cr.json() as Category[];
        if(!active)return;
        setProfile(p);setCities(l);setCategories(c);
        setBusinessName(p.businessName??"");setDescription(p.description??"");
        setPublicPhone(p.publicPhone??"");setPublicWhatsapp(p.publicWhatsapp??"");
        setPublicAddress(p.publicAddress??"");setCitySlug(p.citySlug??"");
        setDistrictSlug(p.districtSlug??"");setLatitude(p.latitude??null);setLongitude(p.longitude??null);
        setCategorySlug(categoryAlias(p.categorySlug));setServiceSlug(serviceAlias(p.serviceSlug));
        const second=p.additionalServices?.[0]??"";
        if(second){
          const owner=c.find(cat=>cat.services.some(name=>slugify(name)===second));
          setSecondCategorySlug(owner?.slug??"");setSecondServiceSlug(second);
        }
      }catch(e){if(active)setError(e instanceof Error?e.message:"Bilgiler yüklenemedi.");}
      finally{if(active)setLoading(false);}
    }
    void load(); return()=>{active=false;};
  },[]);

  async function put(path:string,body:object,key:string){
    const token=getAccessToken(); if(!token)throw new Error("Oturum bilgisi bulunamadı.");
    setSaving(key);setError("");setMessage("");
    try{
      const r=await fetch(`${apiBaseUrl}${path}`,{method:"PUT",headers:{Authorization:`Bearer ${token}`,"Content-Type":"application/json"},body:JSON.stringify(body)});
      const d=await r.json().catch(()=>null);
      if(!r.ok){
        const detail = d?.message ?? (d?.errors ? Object.values(d.errors).flat().join(" ") : null) ?? `Değişiklik kaydedilemedi. HTTP ${r.status}`;
        throw new Error(String(detail));
      }
      if(typeof d?.version==="number")setProfile(o=>o?{...o,version:d.version}:o);
      setMessage(String(d?.message??"Değişiklikler kaydedildi."));return d;
    }finally{setSaving("");}
  }

  async function saveBusiness(){
    if(!profile)return;
    try{
      const d=await put("/api/provider-panel/me/business",{expectedVersion:profile.version,businessName:businessName.trim(),description:description.trim()||null,publicPhone:publicPhone.trim()||null,publicWhatsapp:publicWhatsapp.trim()||null},"business");
      setProfile(o=>o?{...o,businessName:d.businessName??businessName.trim(),description:d.description??null,publicPhone:d.publicPhone??null,publicWhatsapp:d.publicWhatsapp??null,version:d.version??o.version}:o);
    }catch(e){setError(e instanceof Error?e.message:"İşletme bilgileri kaydedilemedi.");}
  }

  async function saveCatalog(){
    if(!profile)return;
    if(!categorySlug||!serviceSlug){setError("Ana kategori ve ana hizmet seçilmelidir.");return;}
    try{
      const d=await put("/api/provider-panel/me/catalog",{expectedVersion:profile.version,categorySlug,serviceSlug,additionalCategorySlug:secondCategorySlug||null,additionalServiceSlug:secondServiceSlug||null},"catalog");
      setProfile(o=>o?{...o,categorySlug:d.categorySlug??categorySlug,serviceSlug:d.serviceSlug??serviceSlug,additionalServices:d.additionalServices??[],version:d.version??o.version}:o);
    }catch(e){setError(e instanceof Error?e.message:"Kategori ve hizmetler kaydedilemedi.");}
  }

  async function saveLocation(){
    if(!profile)return;
    if(!citySlug||!districtSlug){setError("İl ve ilçe seçilmelidir.");return;}
    if(latitude===null||longitude===null){setError("Haritadan işletme konumunu seçin.");return;}
    try{await put("/api/provider-panel/me/location",{citySlug,districtSlug,publicAddress:publicAddress.trim()||null,latitude,longitude},"location");}
    catch(e){setError(e instanceof Error?e.message:"Adres ve konum kaydedilemedi.");}
  }

  function useCurrentLocation(){
    if(!navigator.geolocation){setError("Tarayıcınız konum özelliğini desteklemiyor.");return;}
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      p=>{setLatitude(p.coords.latitude);setLongitude(p.coords.longitude);setLocating(false);},
      ()=>{setError("Konum alınamadı. Haritadan seçebilirsiniz.");setLocating(false);},
      {enableHighAccuracy:true,timeout:12000}
    );
  }

  if(loading)return <div className="rounded-2xl border bg-white p-6">İşletme bilgileri yükleniyor...</div>;
  if(!profile)return <div className="rounded-2xl border bg-white p-6">İşletme profili bulunamadı.</div>;

  const card="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm";
  const selectClass="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100";

  return <div className="space-y-4">
    {message&&<div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">{message}</div>}
    {error&&<div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    <section className={card}>
      <Header icon={Building2} title="İşletme Bilgileri" text="Müşterilere görünen temel bilgiler."/>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Field label="İşletme Adı" value={businessName} onChange={setBusinessName}/>
        <Field label="Telefon" value={publicPhone} onChange={setPublicPhone}/>
        <Field label="WhatsApp" value={publicWhatsapp} onChange={setPublicWhatsapp}/>
        <label className="grid gap-1.5 md:col-span-2"><span className="text-sm font-semibold text-slate-700">Açıklama</span>
          <textarea value={description} onChange={e=>setDescription(e.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"/>
        </label>
      </div>
      <SaveButton busy={saving==="business"} onClick={saveBusiness} text="İşletme Bilgilerini Kaydet"/>
    </section>

    <section className={card}>
      <Header icon={Tags} title="Kategori ve Hizmetler" text="Hizmet alanlarınızı buradan değiştirebilirsiniz."/>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <Select label="Ana Kategori" value={categorySlug} className={selectClass} onChange={v=>{setCategorySlug(v);setServiceSlug("");}} options={categories.map(x=>({value:x.slug,label:x.name}))}/>
        <Select label="Ana Hizmet" value={serviceSlug} className={selectClass} disabled={!selectedCategory} onChange={setServiceSlug} options={(selectedCategory?.services??[]).map(x=>({value:slugify(x),label:x}))}/>
        <Select label="2. Kategori (isteğe bağlı)" value={secondCategorySlug} className={selectClass} allowEmpty onChange={v=>{setSecondCategorySlug(v);setSecondServiceSlug("");}} options={categories.map(x=>({value:x.slug,label:x.name}))}/>
        <Select label="2. Hizmet (isteğe bağlı)" value={secondServiceSlug} className={selectClass} allowEmpty disabled={!selectedSecondCategory} onChange={setSecondServiceSlug} options={(selectedSecondCategory?.services??[]).map(x=>({value:slugify(x),label:x}))}/>
      </div>
      <SaveButton busy={saving==="catalog"} onClick={saveCatalog} text="Kategori ve Hizmetleri Kaydet"/>
    </section>

    <section className={card}>
      <Header icon={MapPin} title="Adres ve Konum" text="Adresinizi ve harita konumunuzu güncelleyin."/>
      <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select label="İl" value={citySlug} className={selectClass} onChange={v=>{setCitySlug(v);setDistrictSlug("");}} options={cities.map(x=>({value:x.slug,label:x.name}))}/>
            <Select label="İlçe" value={districtSlug} className={selectClass} disabled={!selectedCity} onChange={setDistrictSlug} options={(selectedCity?.districts??[]).map(x=>({value:x.slug,label:x.name}))}/>
          </div>
          <label className="grid gap-1.5"><span className="text-sm font-semibold text-slate-700">Açık Adres</span>
            <textarea value={publicAddress} onChange={e=>setPublicAddress(e.target.value)} rows={3} className="rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"/>
          </label>
          <button type="button" onClick={useCurrentLocation} disabled={locating} className="flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 text-sm font-bold text-orange-700 hover:bg-orange-100">
            <LocateFixed className="size-4"/>{locating?"Konum alınıyor...":"Mevcut Konumumu Kullan"}
          </button>
        </div>
        <div className="min-h-[280px] overflow-hidden rounded-xl border border-slate-200">
          <BusinessLocationMap latitude={latitude} longitude={longitude} onChange={loc=>{setLatitude(loc.latitude);setLongitude(loc.longitude);if(loc.address)setPublicAddress(loc.address);}}/>
        </div>
      </div>
      <SaveButton busy={saving==="location"} onClick={saveLocation} text="Adres ve Konumu Kaydet"/>
    </section>
  </div>;
}

function Header({icon:Icon,title,text}:{icon:typeof Building2;title:string;text:string}){
  return <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-orange-50 text-orange-600"><Icon className="size-5"/></span><div><h2 className="text-xl font-black text-slate-950">{title}</h2><p className="text-sm text-slate-500">{text}</p></div></div>;
}
function Field({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){
  return <label className="grid gap-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><input value={value} onChange={e=>onChange(e.target.value)} className="h-11 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"/></label>;
}
function Select({label,value,onChange,options,disabled,allowEmpty,className}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[];disabled?:boolean;allowEmpty?:boolean;className?:string}){
  return <label className="grid gap-1.5"><span className="text-sm font-semibold text-slate-700">{label}</span><select value={value} disabled={disabled} onChange={e=>onChange(e.target.value)} className={className}><option value="">{allowEmpty?"Seçim yok":"Seçin"}</option>{options.map(x=><option key={x.value} value={x.value}>{x.label}</option>)}</select></label>;
}
function SaveButton({busy,onClick,text}:{busy:boolean;onClick:()=>void|Promise<void>;text:string}){
  return <div className="mt-4 flex justify-end"><button type="button" disabled={busy} onClick={()=>void onClick()} className="inline-flex h-11 items-center gap-2 rounded-xl bg-orange-600 px-5 text-sm font-bold text-white hover:bg-orange-700 disabled:opacity-50"><Save className="size-4"/>{busy?"Kaydediliyor...":text}</button></div>;
}
