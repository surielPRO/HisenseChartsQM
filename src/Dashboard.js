import { useState, useEffect, useRef } from "react";
import ChartComponent from "./components/ChartComponent";
import GaussianChart from "./components/GaussianChart";
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
    CPK: 'CPK RESULTS!A:Z'
  },
  POLLING_INTERVAL: 30000 // 30 segundos para verificar cambios
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

    const cycleDuration = 3000;
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (animationPhase === 'showing-one') {
        setVisibleIssues([topIssues[currentIndex]]);
        currentIndex = (currentIndex + 1) % topIssues.length;
        
        if (currentIndex === 0) {
          setTimeout(() => {
            setAnimationPhase('showing-all');
          }, cycleDuration);
        }
      } else {
        setVisibleIssues(topIssues);
        setTimeout(() => {
          setAnimationPhase('showing-one');
        }, cycleDuration);
      }
    }, animationPhase === 'showing-one' ? cycleDuration : cycleDuration * topIssues.length);

    return () => clearInterval(interval);
  }, [topIssues, animationPhase]);

  // Animación para CPK
  useEffect(() => {
    if (cpkData.length === 0) return;

    const cycleDuration = 3000;
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (cpkAnimationPhase === 'showing-one') {
        setVisibleCpkItems([cpkData[currentIndex]]);
        currentIndex = (currentIndex + 1) % cpkData.length;
        
        if (currentIndex === 0) {
          setTimeout(() => {
            setCpkAnimationPhase('showing-all');
          }, cycleDuration);
        }
      } else {
        setVisibleCpkItems(cpkData);
        setTimeout(() => {
          setCpkAnimationPhase('showing-one');
        }, cycleDuration);
      }
    }, cpkAnimationPhase === 'showing-one' ? cycleDuration : cycleDuration * cpkData.length);

    return () => clearInterval(interval);
  }, [cpkData, cpkAnimationPhase]);

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

  const processGaussData = (gaussValues) => {
  if (!gaussValues || gaussValues.length < 4) {
    console.error("La hoja GAUSS BELL debe tener al menos 4 filas (UCL, AVERAGE, X, LCL)");
    return null;
  }

  try {
    // Extracción directa por posición fija de filas
    const uclLine = gaussValues[0].slice(1).map(Number); // Fila 0: UCL LINE (ignorando primera columna)
    const averages = gaussValues[1].slice(1).map(Number); // Fila 1: AVERAGE
    const xValues = gaussValues[2].slice(1).map(Number);  // Fila 2: X (datos reales)
    const lclLine = gaussValues[3].slice(1).map(Number);  // Fila 3: LCL LINE

    // Filtramos valores no numéricos
    const validXValues = xValues.filter(val => !isNaN(val));
    if (validXValues.length === 0) throw new Error("No hay valores numéricos en la fila X");

    // Usamos el primer valor de UCL/LCL como límites (asumiendo son constantes)
    const upperLimit = uclLine[0] || 899.90;
    const lowerLimit = lclLine[0] || 900.50;

    // Calculamos media (usando AVERAGE si existe, si no desde X)
    const mean = averages[0] || validXValues.reduce((sum, val) => sum + val, 0) / validXValues.length;
    
    // Calculamos desviación estándar
    const variance = validXValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / validXValues.length;
    const stdDev = Math.sqrt(variance);

    // Generación de la curva de campana (200 puntos)
    const minX = Math.min(mean - 4 * stdDev, ...validXValues, lowerLimit);
    const maxX = Math.max(mean + 4 * stdDev, ...validXValues, upperLimit);
    const curve = [];
    
    for (let i = 0; i <= 200; i++) {
      const x = minX + (i * (maxX - minX)) / 200;
      curve.push({
        x: parseFloat(x.toFixed(4)),
        y: parseFloat(gaussian(x, mean, stdDev).toFixed(8))
      });
    }

    // Datos para puntos individuales
    const rawData = validXValues.map((val, i) => ({
      x: i + 1, // Índice del punto
      y: val,
      outOfSpec: val < lowerLimit || val > upperLimit,
      ucl: upperLimit,
      lcl: lowerLimit
    }));

    return {
      curve,
      rawData,
      stats: {
        mean,
        stdDev,
        cpk: calculateCpk(validXValues, upperLimit, lowerLimit, mean, stdDev),
        upperLimit,
        lowerLimit,
        outOfSpec: validXValues.filter(v => v < lowerLimit || v > upperLimit).length,
        totalPoints: validXValues.length
      },
      percentiles: calculatePercentiles(validXValues, mean, stdDev)
    };

  } catch (error) {
    console.error("Error procesando GAUSS BELL:", error);
    return null;
  }
};
  // Función de densidad de probabilidad normal
  const gaussian = (x, mean, stdDev) => {
    const exponent = -0.5 * Math.pow((x - mean) / stdDev, 2);
    return (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(exponent);
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
          return {
            week: obj["WEEK"] || `Semana ${rows.indexOf(row) + 1}`,
            dgrt: parseFloat(obj["DGTR"]) || 0,
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
            week: obj["WEEK"] || `Semana ${rows.indexOf(row) + 1}`,
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
        <div className="title">DASHBOARD DE PRODUCCIÓN</div>
        
        {/* Indicador de última actualización */}
        {lastUpdated && (
          <div className="last-updated">
            Última actualización: {lastUpdated.toLocaleTimeString()}
            <button onClick={loadAllData} className="refresh-button">
              Actualizar ahora
            </button>
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
          {/* Fila superior: DGRT Injection */}
          <div 
            ref={el => setContainerRef(0, el)}
            className={`glass-card injection-chart full-width ${activeBorder === 'injection' ? 'active-border' : ''}`}
            style={{ height: '180px' }}
          >
            <h3>DGRT INJECTION</h3>
            {dataInjection.length > 0 ? (
              <div className="chart-container" style={{ height: '120px' }}>
                <ChartComponent 
                  data={dataInjection} 
                  dataKey="dgrt" 
                  color="rgba(255, 255, 255, 0.8)"
                  theme="dark"
                  key={`injection-${dataVersion}`}
                />
              </div>
            ) : (
              <p className="no-data">No hay datos de inyección disponibles</p>
            )}
          </div>

          {/* Segunda fila: Izquierda DGRT PFA, derecha Top Issues */}
          <div className="second-row">
            {/* DGRT PFA */}
            <div 
              ref={el => setContainerRef(1, el)}
              className={`glass-card pfa-chart ${activeBorder === 'pfa' ? 'active-border' : ''}`}
              style={{ height: '180px' }}
            >
              <h3>DGRT PFA</h3>
              {dataPFA.length > 0 ? (
                <div className="chart-container" style={{ height: '120px' }}>
                  <ChartComponent 
                    data={dataPFA} 
                    multiLineKeys={["dayShift", "nightShift", "tgt"]} 
                    colors={[
                      "rgba(100, 255, 150, 0.8)", 
                      "rgba(255, 200, 100, 0.8)", 
                      "rgba(100, 150, 255, 0.8)"
                    ]}
                    theme="dark"
                    key={`pfa-${dataVersion}`}
                  />
                </div>
              ) : (
                <p className="no-data">No hay datos PFA disponibles</p>
              )}
            </div>

            {/* TOP ISSUES */}
            <div 
              ref={el => setContainerRef(2, el)}
              className={`glass-card issues-card ${activeBorder === 'issues' ? 'active-border' : ''}`}
              style={{ height: '180px' }}
            >
              <h3>TOP ISSUES</h3>
              {topIssues.length > 0 ? (
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100% - 40px)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginRight: '-8px',
                    paddingRight: '8px'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.8rem'
                    }}>
                      <thead>
                        <tr>
                          <th style={{
                            padding: '8px',
                            textAlign: 'left',
                            background: 'rgba(0, 100, 200, 0.25)',
                            position: 'sticky',
                            top: 0
                          }}>DEFECT</th>
                          <th style={{
                            padding: '8px',
                            textAlign: 'right',
                            background: 'rgba(0, 100, 200, 0.25)',
                            position: 'sticky',
                            top: 0
                          }}>QTY</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleIssues.map((issue, index) => (
                          <tr 
                            key={`${issue.defect}-${index}-${dataVersion}`}
                            style={{
                              animation: `${animationPhase === 'showing-one' ? 'fadeIn 0.5s ease-in-out' : 'none'}`,
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
                            <td style={{
                              padding: '6px',
                              textAlign: 'right'
                            }}>{issue.qty}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    marginTop: '8px',
                    padding: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    textAlign: 'right',
                    fontSize: '0.8rem'
                  }}>
                    <p>Total: {topIssues.reduce((sum, issue) => sum + issue.qty, 0)}</p>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'calc(100% - 30px)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontStyle: 'italic'
                }}>
                  No se encontraron datos
                </div>
              )}
            </div>
          </div>

          {/* Tercera fila: Izquierda CPK, derecha Gauss Bell */}
          <div className="third-row">
            {/* CPK por Máquina */}
            <div 
              ref={el => setContainerRef(3, el)}
              className={`glass-card cpk-card ${activeBorder === 'cpk' ? 'active-border' : ''}`}
              style={{ height: '220px' }}
            >
              <h3>CPK POR MÁQUINA</h3>
              {cpkData.length > 0 ? (
                <div style={{ 
                  display: 'flex',
                  flexDirection: 'column',
                  height: 'calc(100% - 40px)'
                }}>
                  <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    marginRight: '-8px',
                    paddingRight: '8px'
                  }}>
                    <table style={{
                      width: '100%',
                      borderCollapse: 'collapse',
                      fontSize: '0.8rem'
                    }}>
                      <thead>
                        <tr>
                          <th style={{
                            padding: '8px',
                            textAlign: 'left',
                            background: 'rgba(0, 100, 200, 0.25)',
                            position: 'sticky',
                            top: 0
                          }}>MÁQUINA</th>
                          <th style={{
                            padding: '8px',
                            textAlign: 'center',
                            background: 'rgba(0, 100, 200, 0.25)',
                            position: 'sticky',
                            top: 0
                          }}>CPK</th>
                          <th style={{
                            padding: '8px',
                            textAlign: 'right',
                            background: 'rgba(0, 100, 200, 0.25)',
                            position: 'sticky',
                            top: 0
                          }}>FECHA</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleCpkItems.map((item, index) => (
                          <tr 
                            key={`${item.machine}-${index}-${dataVersion}`}
                            style={{
                              animation: `${cpkAnimationPhase === 'showing-one' ? 'fadeIn 0.5s ease-in-out' : 'none'}`,
                              borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                            }}
                          >
                            <td style={{ padding: '6px' }}>{item.machine}</td>
                            <td style={{ 
                              padding: '6px',
                              textAlign: 'center',
                              color: getCpkColor(item.cpk),
                              fontWeight: cpkAnimationPhase === 'showing-one' ? 'bold' : 'normal'
                            }}>
                              {item.cpk.toFixed(2)}
                            </td>
                            <td style={{ 
                              padding: '6px',
                              textAlign: 'right',
                              fontFamily: 'monospace',
                              fontSize: '0.7rem'
                            }}>
                              {item.date}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div style={{
                    marginTop: '8px',
                    padding: '6px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '4px',
                    textAlign: 'right',
                    fontSize: '0.8rem'
                  }}>
                    <p>CPK Promedio: {(cpkData.reduce((sum, item) => sum + item.cpk, 0) / cpkData.length).toFixed(2)}</p>
                  </div>
                </div>
              ) : (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: 'calc(100% - 30px)',
                  color: 'rgba(255, 255, 255, 0.5)',
                  fontStyle: 'italic'
                }}>
                  No se encontraron datos
                </div>
              )}
            </div>

           {/* Gauss Bell - Renderizado mejorado */}
      <div 
        ref={el => setContainerRef(4, el)}
        className={`glass-card gauss-chart ${activeBorder === 'gauss' ? 'active-border' : ''}`}
        style={{ height: '220px' }}
      >
        <h3>GAUSS BELL - M#6 (T332449)</h3>
        {gaussData.curve.length > 0 ? (
          <div style={{ display: 'flex', height: 'calc(100% - 30px)' }}>
            <div style={{ flex: 1, height: '100%', transform: 'scale(0.8)', transformOrigin: 'top left' }}>
              <GaussianChart 
                curveData={gaussData.curve}
                rawData={gaussData.rawData}
                stats={gaussData.stats}
                percentiles={gaussData.percentiles}
                isSmall={true}
                key={`gauss-${dataVersion}`}
              />
            </div>
            <div style={{
              width: '120px',
              fontSize: '0.75rem',
              paddingLeft: '10px',
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-evenly'
            }}>
              <div>
                <p><strong>Límite Superior:</strong> {gaussData.stats.upperLimit.toFixed(2)}</p>
                <p><strong>Límite Inferior:</strong> {gaussData.stats.lowerLimit.toFixed(2)}</p>
              </div>
              <div>
                <p><strong>Media (μ):</strong> {gaussData.stats.mean.toFixed(2)}</p>
                <p><strong>Desv. Est. (σ):</strong> {gaussData.stats.stdDev.toFixed(2)}</p>
              </div>
              <div>
                <p><strong>CPK:</strong> <span style={{ color: getCpkColor(gaussData.stats.cpk) }}>
                  {gaussData.stats.cpk.toFixed(2)}
                </span></p>
                <p><strong>Fuera de Spec:</strong> {gaussData.stats.outOfSpec}/{gaussData.stats.totalPoints}</p>
              </div>
            </div>
          </div>
        ) : (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 'calc(100% - 30px)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontStyle: 'italic'
          }}>
            {loading ? 'Cargando datos de Gauss Bell...' : 'Datos no disponibles'}
          </div>
        )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;