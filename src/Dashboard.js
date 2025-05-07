import { useState, useEffect, useRef } from "react";
import ChartComponent from "./components/ChartComponent";
import ChartComponentPFA from './components/ChartComponentPFA';
import GaussianChart from "./components/GaussianChart";
import { Link } from "react-router-dom"; // Asegúrate de tener react-router-dom configurado

import "./Dashboard.css";



// Configuración - REEMPLAZA CON TUS DATOS
const GOOGLE_SHEET_CONFIG = {
  SHEET_ID: '1BauFgcB8MMfqFMIkOtT81CLk3eqV58z5SHpiJgWMrTs',
  API_KEY: 'AIzaSyDRq2D4ALWxPq1EnDo1HcihL3h1TCDPgNg',
  SHEET_NAMES: {
    INJECTION: 'DGTR INJECTION!A:Z',
    PFA: 'DGTR PFA!A:Z',
    GAUSS: 'GAUSS BELL!A:P',
    ISSUES: 'TOP ISSUES!A:Z',
    CPK: 'CPK RESULTS!A:Z',
    STP: 'DGTR STP!A:Z' 
  },
  POLLING_INTERVAL: 60000 // 30 segundos para verificar cambios
};
const thStyleLeft = {
  textAlign: 'left',
  padding: '8px',
};

const thStyleCenter = {
  textAlign: 'center',
  padding: '8px',
};

const thStyleRight = {
  textAlign: 'right',
  padding: '8px',
};

const footerStyle = {
  fontWeight: 'bold',
  backgroundColor: 'rgba(255, 255, 255, 0.05)',
  padding: '10px',
};

const emptyStateStyle = {
  textAlign: 'center',
  color: '#ccc',
  fontStyle: 'italic',
  padding: '20px',
};

const Dashboard = () => {
  // Estados iniciales
  const [dataInjection, setDataInjection] = useState([]);
  const [dataPFA, setDataPFA] = useState([]);
  const [gaussData, setGaussData] = useState({
    curve: [],
    rawData: [],
    stats: { 
      mean: 0, 
      stdDev: 0,
      cpk: 0,
      upperLimit: 899.90,
      lowerLimit: 900.50,
      outOfSpec: 0,
      totalPoints: 0
    },
    percentiles: {
      p1: 0,
      p5: 0,
      p25: 0,
      p50: 0,
      p75: 0,
      p95: 0,
      p99: 0
    }
  });
  
  const [topIssues, setTopIssues] = useState([]);
  const [visibleIssues, setVisibleIssues] = useState([]);
  const [animationPhase, setAnimationPhase] = useState('showing-one');
  
  const [cpkData, setCpkData] = useState([]);
  const [visibleCpkItems, setVisibleCpkItems] = useState([]);
  const [cpkAnimationPhase, setCpkAnimationPhase] = useState('showing-one');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [dataVersion, setDataVersion] = useState(0);

  // Efecto LED para resaltar contenedores
  const [activeBorder, setActiveBorder] = useState(null);
  const containerRefs = useRef([]);

  useEffect(() => {
    const containers = ['injection', 'pfa', 'issues', 'cpk', 'gauss'];
    let currentIndex = 0;
    

    const interval = setInterval(() => {
      setActiveBorder(containers[currentIndex]);
      currentIndex = (currentIndex + 1) % containers.length;
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const setContainerRef = (index, element) => {
    containerRefs.current[index] = element;
  };

  // Animación para TOP ISSUES
  useEffect(() => {
    if (topIssues.length === 0) return;
  
    const cycleDuration = 5000;
    let currentIndex = 0;
  
    const interval = setInterval(() => {
      const nextGroup = topIssues.slice(currentIndex, currentIndex + 5);
      setVisibleIssues(nextGroup.length ? nextGroup : topIssues.slice(0, 5));
      setAnimationPhase('showing-group');
  
      currentIndex = (currentIndex + 3) % topIssues.length;
    }, cycleDuration);
  
    return () => clearInterval(interval);
  }, [topIssues]);

  useEffect(() => {
    if (cpkData.length === 0) return;
  
    const cycleDuration = 5000;
    let currentIndex = 0;
  
    const interval = setInterval(() => {
      const nextGroup = cpkData.slice(currentIndex, currentIndex + 5);
      setVisibleCpkItems(nextGroup.length ? nextGroup : cpkData.slice(0, 5));
      setCpkAnimationPhase('showing-group');
  
      currentIndex = (currentIndex + 3) % cpkData.length;
    }, cycleDuration);
  
    return () => clearInterval(interval);
  }, [cpkData]);
    

  // Funciones de cálculo
  const calculatePercentiles = (data, mean, stdDev) => {
    return {
      p1: mean - 2.326 * stdDev,
      p5: mean - 1.645 * stdDev,
      p25: mean - 0.674 * stdDev,
      p50: mean,
      p75: mean + 0.674 * stdDev,
      p95: mean + 1.645 * stdDev,
      p99: mean + 2.326 * stdDev
    };
  };

  const calculateCpk = (data, upperLimit, lowerLimit, mean, stdDev) => {
    if (stdDev === 0) return 0;
    const cpu = (upperLimit - mean) / (3 * stdDev);
    const cpl = (mean - lowerLimit) / (3 * stdDev);
    return Math.min(cpu, cpl);
  };

  const getCpkColor = (cpk) => {
    if (cpk >= 1.67) return '#4CAF50';
    if (cpk >= 1.33) return '#8BC34A';
    if (cpk >= 1.0) return '#FFC107';
    if (cpk >= 0.67) return '#FF9800';
    return '#F44336';
  };

  // Función para cargar datos de Google Sheets con verificación de cambios
  const fetchGoogleSheetData = async (sheetName) => {
    try {
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.SHEET_ID}/values/${sheetName}?key=${GOOGLE_SHEET_CONFIG.API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error.message || 'Error al cargar datos');
      }

      return data.values || [];
    } catch (error) {
      console.error(`Error al cargar ${sheetName}:`, error);
      throw error;
    }
  };

// Función de densidad de probabilidad normal (Gaussiana)
const gaussian = (x, mean, stdDev) => {
  const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
  return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
};

  const processGaussData = (gaussValues) => {
    try {
      // Valores fijos según tus requerimientos
      const target = 900.20;
      const upperLimit = 900.50;
      const lowerLimit = 899.90;
  
      // Extrae solo los valores reales (fila X) ignorando encabezados
      const rawValues = gaussValues.length >= 3 
        ? gaussValues[2].slice(1).map(Number).filter(val => !isNaN(val))
        : [];
  
      // Si no hay datos, usa valores de ejemplo
      const validValues = rawValues.length > 0 ? rawValues : [target];
      const mean = validValues.reduce((sum, val) => sum + val, 0) / validValues.length;
      const stdDev = Math.sqrt(
        validValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validValues.length
      );
  
      // Genera la curva de campana (rango ±4σ desde la media)
      const curve = [];
      const minX = Math.min(mean - 4 * stdDev, lowerLimit);
      const maxX = Math.max(mean + 4 * stdDev, upperLimit);
  
      for (let i = 0; i <= 200; i++) {
        const x = minX + (i * (maxX - minX)) / 200;
        curve.push({
          x: parseFloat(x.toFixed(4)),
          y: parseFloat(gaussian(x, mean, stdDev).toFixed(8))
        });
      }
  
      return {
        curve,
        rawData: validValues.map((val, i) => ({
          x: i + 1,
          y: val,
          outOfSpec: val < lowerLimit || val > upperLimit
        })),
        stats: {
          mean,
          stdDev,
          cpk: calculateCpk(validValues, upperLimit, lowerLimit, mean, stdDev),
          upperLimit,
          lowerLimit,
          outOfSpec: validValues.filter(v => v < lowerLimit || v > upperLimit).length,
          totalPoints: validValues.length
        }
      };
    } catch (error) {
      console.error("Error procesando GAUSS BELL:", error);
      return null;
    }
  };

  // Función de carga de datos actualizada
  const loadAllData = async () => {
    try {
      setLoading(true);
      setError(null);
      const now = new Date();

      // Cargar datos de inyección
      const injectionValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.INJECTION);
      if (injectionValues.length > 1) {
        const headers = injectionValues[0];
        const rows = injectionValues.slice(1);
        
        const formattedInjection = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          
          const dgrtValue = parseFloat(obj["DGTR"]) || 0;
          const tgtValue = parseFloat(obj["TGT"]) || 0; 

          return {
            week: obj["DAY"] || `Dia ${rows.indexOf(row) + 1}`,
            dgrt: dgrtValue,
            TGT: tgtValue,
            dgrtDisplay: `${(dgrtValue * 100).toFixed(2)}%`, // Versión en porcentaje
            date: obj["DATE"] || null,
            machine: obj["MACHINE"] || "N/A"
          };
        });
        setDataInjection(formattedInjection);
      }

      // Cargar datos PFA
      const pfaValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.PFA);
      if (pfaValues.length > 1) {
        const headers = pfaValues[0];
        const rows = pfaValues.slice(1);
        
        const formattedPFA = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return {
            week: obj["DAY"] || `Dia ${rows.indexOf(row) + 1}`,
            dayShift: parseFloat(obj["DAY SHIFT"]) || 0,
            nightShift: parseFloat(obj["NIGHT SHIFT"]) || 0,
            tgt: parseFloat(obj["TGT"]) || 0,
            efficiency: parseFloat(obj["EFFICIENCY"]) || 0,
            defects: parseFloat(obj["DEFECTS"]) || 0
          };
        });
        setDataPFA(formattedPFA);
      }

      
      // Cargar y procesar datos para Gauss Bell
      const gaussValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.GAUSS);
      if (gaussValues && gaussValues.length >= 4) {
        const processedGauss = processGaussData(gaussValues);
        if (processedGauss) {
          setGaussData(processedGauss);
        } else {
          throw new Error("No se pudieron procesar los datos de Gauss Bell");
        }
      } else {
        throw new Error(`Estructura de datos incorrecta. Se esperaban al menos 4 filas, se recibieron ${gaussValues?.length || 0}`);
      }

      // Cargar Top Issues
      const issuesValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.ISSUES);
      if (issuesValues.length > 1) {
        const headers = issuesValues[0];
        const rows = issuesValues.slice(1);
        
        const formattedIssues = rows
          .map(row => {
            const obj = {};
            headers.forEach((header, index) => {
              obj[header] = row[index] || '';
            });
            
            const defectCol = Object.keys(obj).find(key => 
              key.toLowerCase().includes("defect") || 
              key.toLowerCase().includes("issue")
            );
            
            const qtyCol = Object.keys(obj).find(key => 
              key.toLowerCase().includes("qty") || 
              key.toLowerCase().includes("cantidad")
            );
            
            return {
              defect: defectCol ? String(obj[defectCol]) : "Unknown",
              qty: qtyCol ? parseInt(obj[qtyCol]) || 0 : 0
            };
          })
          .filter(issue => issue.qty > 0)
          .sort((a, b) => b.qty - a.qty)
          .slice(0, 7);

        setTopIssues(formattedIssues);
      }

      // Cargar datos CPK
      const cpkValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.CPK);
      if (cpkValues.length > 1) {
        const headers = cpkValues[0];
        const rows = cpkValues.slice(1);
        
        const formattedCpk = rows.map(row => {
          const obj = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          
          const machineKey = Object.keys(obj).find(key => 
            key.toLowerCase().includes('maquina') || 
            key.toLowerCase().includes('machine')
          );
          
          const cpkKey = Object.keys(obj).find(key => 
            key.toLowerCase() === 'cpk'
          );
          
          const dateKey = Object.keys(obj).find(key => 
            key.toLowerCase().includes('fecha') || 
            key.toLowerCase().includes('date')
          );

          const rawMachine = machineKey ? String(obj[machineKey]) : "N/A";
          const formattedMachine = rawMachine.startsWith('M') ? rawMachine : 
                                 `MH${rawMachine.replace(/\D/g, '')}`;
          return {
            machine: formattedMachine,
            cpk: cpkKey ? parseFloat(obj[cpkKey]) || 0 : 0,
            date: dateKey ? formatDate(obj[dateKey]) : "N/A"
          };
        }).filter(item => !isNaN(item.cpk)).sort((a, b) => b.cpk - a.cpk);

        setCpkData(formattedCpk);
      }

      setLastUpdated(now);
      setDataVersion(prev => prev + 1);

    } catch (error) {
      console.error("Error al cargar datos:", error);
      setError(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Efecto para cargar datos periódicamente
  useEffect(() => {
    loadAllData();
    
    const interval = setInterval(loadAllData, GOOGLE_SHEET_CONFIG.POLLING_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    
    try {
      if (/^\d{2}-\d{2}-\d{4}$/.test(dateString)) {
        return dateString;
      }
      
      if (typeof dateString === 'number') {
        const date = new Date((dateString - (25567 + 2)) * 86400 * 1000);
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit'
        }).replace(/\//g, '/');
      }
      
      const date = new Date(dateString);
      if (!isNaN(date.getTime())) {
        return date.toLocaleDateString('es-ES', {
          day: '2-digit',
          month: '2-digit'
        }).replace(/\//g, '/');
      }
      
      return dateString;
    } catch {
      return dateString;
    }
  };

  return (
    <div className="dashboard">
      <div className="overlay"></div>
      
      <div className="content">
        <div className="title">QUALITY DASHBOARD</div>
        
        {/* Indicador de última actualización */}
{lastUpdated && (
  <div className="last-updated">
    Last update: {lastUpdated.toLocaleTimeString()}
    
    <button onClick={loadAllData} className="refresh-button">
      Update
    </button>

    <Link to="/pmp">
      <button className="refresh-button">
        Dashboard PMP
      </button>
    </Link>
  </div>
)}


        {loading && (
          <div className="loading-overlay">
            <div className="loading-spinner"></div>
            <p>Cargando datos...</p>
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
            <button onClick={loadAllData}>Reintentar</button>
          </div>
        )}

        <div className="charts-grid">
          {/* Fila superior: DGTR Injection */}
          <div 
            ref={el => setContainerRef(0, el)}
            className={`glass-card injection-chart full-width ${activeBorder === 'injection' ? 'active-border' : ''}`}
            style={{ height: '190px' }}
          >
            <h3>DGTR INJECTION</h3>
            {dataInjection.length > 0 ? (
             <div className="chart-container" style={{ height: '120px' }}>
            <ChartComponent 
              data={dataInjection} 
              multiLineKeys={["TGT", "dgrt"]} // Aquí agregas TGT
              colors={['red','#4fc3f7']}
              stroke="rgba(255, 255, 255, 0.8)"
              showValues={true}
              valueFormatter={(value) => `${(value * 100).toFixed(2)}%`}
              dot={{ r: 2, fill: '#4fc3f7' }}
              yAxisProps={{
                domain: [0.75, 1],
                tickCount: 6,
                ticks: [0.75, 0.8, 0.85, 0.9, 0.95, 1],
              }}
            />
           </div>
            
            ) : (
              <p className="no-data">No hay datos de inyección disponibles</p>
            )}
          </div>

         {/* Segunda fila: Izquierda y derecha DGTR PFA */}
         <div className="second-row" style={{ display: 'flex', gap: '16px' }}>
    
   {/* CPK y Top Issues lado a lado */}
   <div style={{ display: 'flex', flex: 1, gap: '16px', height: '290px' }}>
    
    {/* CPK */}
    <div 
      ref={el => setContainerRef(3, el)}
      className={`glass-card cpk-card ${activeBorder === 'cpk' ? 'active-border' : ''}`}
      style={{ flex: 1 }}
    >
      <h3>CPK FOR MACHINE</h3>
      {cpkData.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginRight: '-8px', paddingRight: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.5rem' }}>
              <thead>
                <tr>
                  <th style={thStyleLeft}>MACHINE</th>
                  <th style={thStyleCenter}>CPK</th>
                  <th style={thStyleRight}>DATE</th>
                </tr>
              </thead>
              <tbody>
                {visibleCpkItems.map((item, index) => (
                  <tr 
                    key={`${item.machine}-${index}-${dataVersion}`}
                    style={{
                      animation: cpkAnimationPhase === 'showing-one' ? 'fadeIn 0.5s ease-in-out' : 'none',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                  >
                    <td style={{ padding: '6px' }}>{item.machine}</td>
                    <td style={{ padding: '6px', textAlign: 'center', color: getCpkColor(item.cpk), fontWeight: 'bold' }}>
                      {item.cpk.toFixed(2)}
                    </td>
                    <td style={{ padding: '6px', textAlign: 'right', fontFamily: 'monospace', fontSize: '0.7rem' }}>
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={footerStyle}>
            <p>CPK Average: {(cpkData.reduce((sum, item) => sum + item.cpk, 0) / cpkData.length).toFixed(2)}</p>
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle}>No se encontraron datos</div>
      )}
    </div>

    {/* Top Issues */}
    <div 
      ref={el => setContainerRef(4, el)}
      className={`glass-card issues-card ${activeBorder === 'issues' ? 'active-border' : ''}`}
      style={{ flex: 1 }}
    >
      <h3>TOP ISSUES</h3>
      {topIssues.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
          <div style={{ flex: 1, overflowY: 'auto', marginRight: '-8px', paddingRight: '8px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem' }}>
              <thead>
                <tr>
                  <th style={thStyleLeft}>DEFECT</th>
                  <th style={thStyleRight}>QTY</th>
                </tr>
              </thead>
              <tbody>
                {visibleIssues.map((issue, index) => (
                  <tr 
                    key={`${issue.defect}-${index}-${dataVersion}`}
                    style={{
                      animation: animationPhase === 'showing-group' ? 'fadeIn 0.5s ease-in-out' : 'none',
                      borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                    }}
                    
                  >
                    <td style={{
                      padding: '6px',
                      maxWidth: '120px',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>{issue.defect}</td>
                    <td style={{ padding: '6px', textAlign: 'right' }}>{issue.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={footerStyle}>
            <p>Total: {topIssues.reduce((sum, issue) => sum + issue.qty, 0)}</p>
          </div>
        </div>
      ) : (
        <div style={emptyStateStyle}>No se encontraron datos</div>
      )}
    </div>
  </div>

  {/* Gauss Bell a la derecha */}
  {gaussData.curve.length > 0 && (() => {
    const mean = 900.04;
    const upperLimit = 900.50;
    const lowerLimit = 899.90;
    const cpk = 0.45;
    const outOfSpecCount = gaussData.curve.filter(d => d.x < lowerLimit || d.x > upperLimit).length;

    return (
      <div className="glass-card gauss-chart" style={{ width: '50%', height: '290px', padding: '0px' }}>
        <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold'  }}>GRAPH GAUSS BELL</h3>
        <div style={{ display: 'flex', height: 'calc(100% - 40px)', gap: '10px' }}>
          {/* Chart */}
          <div style={{ flex: 1, position: 'relative', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}>
            <GaussianChart 
              curveData={gaussData.curve}
              stats={{ mean, upperLimit, lowerLimit, cpk }}
              isSmall={true}
              key={`gauss-${dataVersion}`}
            />
          </div>

          {/* Stats Panel */}
          <div style={{ width: '130px', padding: '8px', background: 'rgba(30, 30, 30, 0.7)', borderRadius: '6px', fontSize: '12px',fontWeight: 'bold' }}>
            <div style={{ marginBottom: '12px' }}>
              <p><strong>Average:</strong> {mean.toFixed(2)}</p>
              <p><strong>Superior Limit :</strong> {upperLimit.toFixed(2)}</p>
              <p><strong>Lower Limit :</strong> {lowerLimit.toFixed(2)}</p>
            </div>
            <div>
              <p><strong>Target:</strong> 900.20</p>
              <p><strong>CPK:</strong> {cpk.toFixed(2)}</p>
              {/* <p><strong>Fuera de Spec:</strong> {outOfSpecCount}</p> */}
              
            </div>
          </div>
        </div>
      </div>
    );
  })()}
</div>

  {/* Tercera fila: Izquierda CPK, derecha Top Issues */}
  <div className="third-row">
 
  {/* DGTR PFA - izquierda */}
  <div 
    ref={el => setContainerRef(1, el)}
    className={`glass-card pfa-chart ${activeBorder === 'pfa' ? 'active-border' : ''}`}
    style={{ height: '190px', width: '50%' }}
  >
    <h3>DGTR PFA DAY</h3>
    {dataPFA.length > 0 ? (
      <div style={{ width: '100%', height: '180px' }}>
        <ChartComponentPFA 
          data={dataPFA}
          multiLineKeys={["dayShift", "tgt"]}
          colors={["#07a9ff", "#ff0707"]}
        />
      </div>
    ) : (
      <p className="no-data">No hay datos PFA disponibles</p>
    )}
  </div>

  {/* DGTR PFA - derecha (repetido) */}
  <div 
    ref={el => setContainerRef(2, el)}
    className={`glass-card pfa-chart ${activeBorder === 'pfa' ? 'active-border' : ''}`}
    style={{ height: '190px', width: '50%' }}
  >
    <h3>DGTR PFA NIGHT</h3>
    {dataPFA.length > 0 ? (
      <div style={{ width: '100%', height: '180px' }}>
        <ChartComponentPFA 
          data={dataPFA}
          multiLineKeys={["nightShift", "tgt"]}
          colors={["#37d500", "#ff0707"]}
        />
      </div>
    ) : (
      <p className="no-data">No hay datos PFA disponibles</p>
    )}
  </div>
</div>
            </div>
          </div>
        
          </div>
  );
};

export default Dashboard;