-- Contenido educativo para la seccion Aprende conceptos.
-- Ejecutar en Supabase SQL Editor.

create table if not exists public.concept_lessons (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  level text not null,
  title text not null,
  summary text not null,
  why_it_matters text not null,
  key_ideas jsonb not null default '[]'::jsonb,
  example text not null,
  check_question text not null,
  check_answer text not null,
  order_index integer not null default 0,
  is_published boolean not null default true,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  constraint concept_lessons_level_check
    check (level in ('base', 'intermedio', 'avanzado'))
);

create table if not exists public.concept_glossary (
  id uuid primary key default gen_random_uuid(),
  term text not null unique,
  definition text not null,
  order_index integer not null default 0,
  created_at timestamp with time zone default now()
);

create index if not exists concept_lessons_level_idx
  on public.concept_lessons(level);

create index if not exists concept_lessons_order_idx
  on public.concept_lessons(order_index);

create index if not exists concept_glossary_order_idx
  on public.concept_glossary(order_index);

insert into public.concept_lessons (
  slug,
  level,
  title,
  summary,
  why_it_matters,
  key_ideas,
  example,
  check_question,
  check_answer,
  order_index
) values
(
  'rentabilidad-riesgo',
  'base',
  'Rentabilidad y riesgo',
  'La rentabilidad mide cuanto gana o pierde una inversion. El riesgo mide cuanto puede variar ese resultado.',
  'Dos decisiones pueden tener la misma rentabilidad esperada, pero no el mismo peligro. Aprender a comparar ambas cosas evita elegir solo por la posible ganancia.',
  '["Mas rentabilidad potencial suele venir con mas incertidumbre.", "Una perdida grande necesita una ganancia mayor para recuperarse.", "El objetivo no es acertar siempre, sino tomar decisiones compensadas."]'::jsonb,
  'Si una accion puede subir un 8% pero tambien caer un 20%, la recompensa posible no compensa automaticamente el riesgo.',
  'Si una inversion puede ganar mucho pero tambien caer mucho, que deberias mirar ademas de la ganancia potencial?',
  'El riesgo asumido, la posible perdida y si la recompensa compensa ese riesgo.',
  1
),
(
  'diversificacion',
  'base',
  'Diversificacion',
  'Diversificar consiste en no concentrar todo el capital en una sola empresa, sector o tipo de activo.',
  'Reduce el impacto de un error concreto. Si una posicion sale mal, el resto de la cartera puede amortiguar el golpe.',
  '["No es comprar muchas cosas al azar.", "Tiene sentido combinar activos que no se comporten igual.", "Demasiada concentracion aumenta la dependencia de una sola decision."]'::jsonb,
  'Una cartera formada solo por tecnologia puede sufrir mucho si el sector cae. Incluir sectores distintos reduce esa dependencia.',
  'Diversificar significa comprar cualquier activo solo para tener muchos?',
  'No. Significa repartir el riesgo con criterio entre activos o sectores diferentes.',
  2
),
(
  'tendencia',
  'base',
  'Tendencia',
  'La tendencia describe la direccion dominante del precio: alcista, bajista o lateral.',
  'Ayuda a entender el contexto antes de tomar una decision. Comprar contra una tendencia bajista suele exigir mas cautela.',
  '["Una tendencia alcista tiene maximos y minimos crecientes.", "Una tendencia bajista tiene maximos y minimos decrecientes.", "Un mercado lateral no tiene direccion clara."]'::jsonb,
  'Si el precio marca varios minimos cada vez mas altos, puede indicar que los compradores estan ganando fuerza.',
  'Que suele indicar una secuencia de maximos y minimos crecientes?',
  'Una posible tendencia alcista.',
  3
),
(
  'soporte-resistencia',
  'intermedio',
  'Soportes y resistencias',
  'Un soporte es una zona donde el precio suele encontrar compradores. Una resistencia es una zona donde suelen aparecer vendedores.',
  'Sirven para plantear entradas, salidas y zonas de invalidacion de una idea.',
  '["Son zonas, no lineas exactas.", "Un soporte perdido puede convertirse en resistencia.", "Funcionan mejor si se combinan con volumen, tendencia y riesgo."]'::jsonb,
  'Si una accion rebota varias veces cerca de 50 euros, esa zona puede actuar como soporte mientras no se rompa con claridad.',
  'Por que es mejor hablar de zonas y no de precios exactos?',
  'Porque el mercado rara vez respeta un punto exacto; suele moverse por areas de interes.',
  4
),
(
  'medias-moviles',
  'intermedio',
  'Medias moviles',
  'Una media movil suaviza el precio para ver mejor la direccion general del mercado.',
  'Ayuda a filtrar ruido y comparar el precio actual con su comportamiento reciente.',
  '["Una media corta reacciona antes, pero da mas senales falsas.", "Una media larga reacciona mas lento, pero filtra mejor el ruido.", "El cruce de medias no garantiza una operacion rentable."]'::jsonb,
  'Si el precio esta por encima de la media de 50 sesiones y esta subiendo, puede reforzar una lectura alcista.',
  'Que problema tiene una media movil muy corta?',
  'Reacciona rapido, pero puede generar mas senales falsas por el ruido del precio.',
  5
),
(
  'rsi',
  'intermedio',
  'RSI',
  'El RSI es un indicador de momento que intenta medir si un activo esta muy comprado o muy vendido.',
  'Puede ayudar a detectar agotamiento, pero no debe usarse como senal aislada.',
  '["Valores altos pueden indicar sobrecompra.", "Valores bajos pueden indicar sobreventa.", "En tendencias fuertes, el RSI puede mantenerse extremo durante tiempo."]'::jsonb,
  'Un RSI alto no significa vender automaticamente. Puede indicar fuerza si el activo esta en tendencia alcista.',
  'Un RSI alto obliga siempre a vender?',
  'No. Hay que interpretarlo junto con tendencia, volumen y contexto.',
  6
),
(
  'drawdown',
  'avanzado',
  'Drawdown',
  'El drawdown mide la caida desde un maximo hasta un minimo posterior en una cartera o activo.',
  'Permite evaluar cuanto dolor puede sufrir una estrategia antes de recuperarse.',
  '["Una estrategia rentable puede ser mala si sus caidas son demasiado grandes.", "El drawdown afecta al capital y tambien a la disciplina del inversor.", "Controlarlo ayuda a sobrevivir a rachas negativas."]'::jsonb,
  'Si una cartera pasa de 10.000 a 8.000 euros, ha sufrido un drawdown del 20%.',
  'Por que importa el drawdown si una estrategia acaba ganando dinero?',
  'Porque una caida excesiva puede hacer que el usuario abandone o no pueda recuperarse bien.',
  7
),
(
  'tamano-posicion',
  'avanzado',
  'Tamano de posicion',
  'El tamano de posicion define cuanto capital se arriesga en una decision concreta.',
  'Es una de las herramientas mas importantes para controlar perdidas y evitar que una sola decision destruya la cartera.',
  '["No todas las ideas merecen el mismo capital.", "Arriesgar poco permite aprender y sobrevivir a errores.", "El tamano debe relacionarse con el stop, la volatilidad y la confianza."]'::jsonb,
  'Si decides no perder mas de 100 euros y tu stop esta a 2 euros por accion, el tamano maximo seria 50 acciones.',
  'Que relacion hay entre stop y tamano de posicion?',
  'Cuanto mas lejos este el stop, menor deberia ser el numero de acciones para mantener controlado el riesgo.',
  8
),
(
  'sesgo-confirmacion',
  'avanzado',
  'Sesgo de confirmacion',
  'Es la tendencia a buscar informacion que confirma lo que ya pensamos e ignorar senales contrarias.',
  'En inversion puede hacer que mantengamos una mala idea demasiado tiempo.',
  '["Una buena decision tambien busca argumentos en contra.", "Cambiar de opinion no es fallar; es actualizarse.", "Las explicaciones de IA ayudan si se usan para cuestionar, no para justificar."]'::jsonb,
  'Si quieres comprar una accion, conviene revisar tambien que podria salir mal antes de entrar.',
  'Que pregunta ayuda a reducir este sesgo?',
  'Que tendria que pasar para demostrar que mi idea era equivocada?',
  9
)
on conflict (slug) do update set
  level = excluded.level,
  title = excluded.title,
  summary = excluded.summary,
  why_it_matters = excluded.why_it_matters,
  key_ideas = excluded.key_ideas,
  example = excluded.example,
  check_question = excluded.check_question,
  check_answer = excluded.check_answer,
  order_index = excluded.order_index,
  is_published = true,
  updated_at = now();

insert into public.concept_glossary (term, definition, order_index) values
('Activo', 'Instrumento financiero como una accion, criptomoneda, indice o ETF.', 1),
('Volatilidad', 'Medida de cuanto se mueve el precio. Mas volatilidad implica mas incertidumbre.', 2),
('Liquidez', 'Facilidad para comprar o vender sin mover demasiado el precio.', 3),
('Stop', 'Nivel definido para limitar una perdida si la idea no funciona.', 4),
('Horizonte temporal', 'Tiempo durante el que se espera mantener una decision.', 5),
('Backtest', 'Prueba de una estrategia con datos historicos.', 6)
on conflict (term) do update set
  definition = excluded.definition,
  order_index = excluded.order_index;
