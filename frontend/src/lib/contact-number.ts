export function contactDigits(value?: string | null) {
  let number = value?.replace(/\D/g, "") ?? "";
  if (number.startsWith("00")) number = number.slice(2);
  if (number.length === 11 && number.startsWith("0")) number = `90${number.slice(1)}`;
  else if (number.length === 10) number = `90${number}`;
  return /^[1-9]\d{7,14}$/.test(number) ? number : "";
}

