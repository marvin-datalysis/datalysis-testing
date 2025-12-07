export const convertirFecha=(fechaDDMMYYYY: string)=> {
  const [dd, mm, yyyy] = fechaDDMMYYYY.split('/');
  return `${yyyy}-${mm}-${dd}`;
}