-- =========================================================================
-- Mapa de Produtividade — CD Simão · banco de dados no Supabase
-- Rode uma vez no SQL Editor do projeto (rodar de novo não estraga nada).
-- =========================================================================

-- Documentos do mapa (as mesmas coleções do artefato: lancamentos, colaboradores,
-- meses, parametros, metas, importacoes, planoAcao e historico)
create table if not exists public.documentos (
  colecao        text        not null,
  id             text        not null,
  dados          jsonb       not null,
  atualizado_em  timestamptz not null default now(),
  atualizado_por uuid                 default auth.uid(),
  primary key (colecao, id)
);

-- Quem pode entrar e com qual papel:
--   leitor = consulta, filtra e exporta
--   editor = também inclui, edita, exclui e importa
--   dono   = como editor (reservado para o responsável pelo Mapa)
create table if not exists public.perfis (
  email     text        primary key,
  papel     text        not null check (papel in ('leitor', 'editor', 'dono')),
  nome      text,
  criado_em timestamptz not null default now()
);

-- Papel de quem está conectado (nulo = sem acesso)
create or replace function public.papel_atual()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.papel
    from public.perfis p
   where lower(p.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
$$;
revoke all on function public.papel_atual() from public, anon;
grant execute on function public.papel_atual() to authenticated;

-- Carimbo de quem alterou e quando
create or replace function public.marcar_atualizacao()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.atualizado_em := now();
  new.atualizado_por := auth.uid();
  return new;
end
$$;
drop trigger if exists documentos_atualizacao on public.documentos;
create trigger documentos_atualizacao
  before insert or update on public.documentos
  for each row execute function public.marcar_atualizacao();

-- Regras de acesso: só quem está em perfis lê; só editor e dono gravam
alter table public.documentos enable row level security;
alter table public.perfis enable row level security;

revoke all on public.documentos from anon;
revoke all on public.perfis from anon;
grant select, insert, update, delete on public.documentos to authenticated;
grant select on public.perfis to authenticated;

drop policy if exists "documentos: leitura" on public.documentos;
create policy "documentos: leitura" on public.documentos
  for select to authenticated
  using ((select public.papel_atual()) is not null);

drop policy if exists "documentos: inclusão" on public.documentos;
create policy "documentos: inclusão" on public.documentos
  for insert to authenticated
  with check ((select public.papel_atual()) in ('editor', 'dono'));

drop policy if exists "documentos: alteração" on public.documentos;
create policy "documentos: alteração" on public.documentos
  for update to authenticated
  using ((select public.papel_atual()) in ('editor', 'dono'))
  with check ((select public.papel_atual()) in ('editor', 'dono'));

drop policy if exists "documentos: exclusão" on public.documentos;
create policy "documentos: exclusão" on public.documentos
  for delete to authenticated
  using ((select public.papel_atual()) in ('editor', 'dono'));

drop policy if exists "perfis: o próprio" on public.perfis;
create policy "perfis: o próprio" on public.perfis
  for select to authenticated
  using (lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));

-- Atualização em tempo real entre quem está com o Mapa aberto
do $$
begin
  alter publication supabase_realtime add table public.documentos;
exception
  when duplicate_object then null;
  when undefined_object then raise notice 'Publicação supabase_realtime não encontrada: o Mapa funciona, conferindo os dados a cada 30 segundos.';
end
$$;

-- -------------------------------------------------------------------------
-- Liberar pessoas: troque os e-mails, tire os "--" do começo das linhas e rode.
-- Cada pessoa também precisa existir em Authentication › Users (Add user).
-- -------------------------------------------------------------------------
-- insert into public.perfis (email, papel, nome) values
--   ('seu-email@exemplo.com',   'dono',   'Responsável pelo Mapa'),
--   ('ceo@exemplo.com',         'leitor', 'CEO'),
--   ('gerente@exemplo.com',     'leitor', 'Gerente do CD')
-- on conflict (email) do update set papel = excluded.papel, nome = excluded.nome;
