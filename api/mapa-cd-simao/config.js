// Mapa de Produtividade — CD Simão: entrega à página o endereço do Supabase e a chave pública.
// A chave pública (anon/publishable) é feita para ficar no navegador; quem protege os dados são
// as regras do banco (publicacao/supabase.sql). Nunca devolver a chave de serviço (service_role).
module.exports = (req, res) => {
  const env = process.env;
  const url = env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL || '';
  const chave = env.SUPABASE_ANON_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    || env.SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || '';
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify({ url, chave }));
};
