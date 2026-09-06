# ??? Voz do Cliente (VoC) & Enriquecimento com IA (Gemini API & NLP)

Pipeline analítico de ponta a ponta que utiliza **Gemini 1.5 Flash** com **Structured Outputs (Pydantic)** para analisar avaliações de clientes (reviews de e-commerce), extrair causas-raiz de insatisfação, quantificar risco de churn e cruzar com o Diagrama de Pareto de prejuízo financeiro.

---

## ?? Principais Diferenciais Técnicos

- **Structured Outputs Estritos:** Respostas 100% tipadas via Pydantic (esponse_schema), sem falhas de parsing JSON.
- **FinOps & Otimização de Custo:** Custo médio de ~R$ 0,0002 por review analisada utilizando Gemini 1.5 Flash.
- **Análise Multidimensional (ABSA):** Classificação por aspecto (Bateria, Conectividade, Áudio, Ergonomia, Logística, SAC).
- **Diagrama de Pareto 80/20:** Cruzamento direto do volume de reclamações com o valor financeiro das devoluções.
- **Interface Interativa com Streamlit:** Dashboard com gráficos Plotly e playground de classificação ao vivo.

---

## ??? Stack Tecnológica

- **Linguagem:** Python 3.11+
- **LLM Engine:** Google GenAI SDK (google-genai) & Gemini 1.5 Flash
- **Contratos de Dados:** Pydantic v2
- **Data Engineering:** Polars & PyArrow
- **Visualização Web:** Streamlit & Plotly
- **CLI & Logging:** Rich
- **Testes & Qualidade:** Pytest & Ruff

---

## ?? Como Executar

### 1. Clonar e criar ambiente virtual
`ash
git clone https://github.com/Renanbritto/voz-do-cliente.git
cd voz-do-cliente
python -m venv .venv
source .venv/bin/activate  # No Windows: .venv\Scripts\activate
pip install -r requirements.txt
`

### 2. Configurar variáveis de ambiente
Crie um arquivo .env na raiz:
`env
GEMINI_API_KEY=sua_chave_do_google_ai_studio_aqui
`

### 3. Rodar o Dashboard Streamlit
`ash
streamlit run app.py
`
