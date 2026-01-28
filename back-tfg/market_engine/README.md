Market Engine

GET /market/scenario/random → Devuelve un escenario de inversión aleatorio con histórico, indicadores y recomendación de la IA.

GET /market/scenario/{scenario_id} → Devuelve un escenario específico según su ID.

POST /market/scenario/{scenario_id}/reveal → Recibe la acción del usuario (BUY, HOLD, SELL), compara con la IA y devuelve el resultado real del mercado, puntaje del usuario y la IA, trayectoria futura de precios y razones de la IA.

Flujo de uso para el frontend

Obtener un escenario (/random o /scenario/{id}).

Mostrarlo al usuario con gráficos e indicadores.

Permitir que el usuario elija acción (BUY, HOLD, SELL).

Enviar la acción a /reveal y mostrar el resultado con puntaje, futuro del mercado y decisión de la IA.