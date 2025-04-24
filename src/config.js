// config.js

const GOOGLE_SHEET_CONFIG = {
    SHEET_ID: '1BauFgcB8MMfqFMIkOtT81CLk3eqV58z5SHpiJgWMrTs',
    API_KEY: 'AIzaSyDRq2D4ALWxPq1EnDo1HcihL3h1TCDPgNg',
    SHEET_NAMES: {
      INJECTION: 'DGTR INJECTION!A:Z',
      STP:       'DGTR STP!A:Z',
      PFA:       'DGTR PFA!A:Z',
      GAUSS:     'GAUSS BELL!A:P',
      CPK:       'CPK RESULTS!A:Z',
    TOP_ISSUES: "TOP ISSUES",
    TOP_ISSUES_STP: "TOP ISSUES STP"
    },
    POLLING_INTERVAL: 60000 // 1 minuto (en milisegundos)
  };
  
  export { GOOGLE_SHEET_CONFIG };
  