import React, { useEffect, useState, useRef } from "react";
import ChartComponent from "./components/ChartComponent";
import ChartComponentPFA from "./components/ChartComponentPFA";
import { GOOGLE_SHEET_CONFIG } from './config';
import "./Dashboard.css";

const fetchGoogleSheetData = async (sheetName) => {
  try {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${GOOGLE_SHEET_CONFIG.SHEET_ID}/values/${sheetName}?key=${GOOGLE_SHEET_CONFIG.API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error.message || 'Error al cargar datos');
    return data.values || [];
  } catch (error) {
    console.error(`Error al cargar ${sheetName}:`, error);
    throw error;
  }
};

function GraficasOtroArea() {
  const [injectionData, setInjectionData] = useState([]);
  const [stpData, setStpData] = useState([]);
  const [dataPFA, setDataPFA] = useState([]);
  const [topIssuesInjection, setTopIssuesInjection] = useState([]);
  const [topIssuesStp, setTopIssuesStp] = useState([]);

  const [fadeInjection, setFadeInjection] = useState(false);
  const [fadeStp, setFadeStp] = useState(false);

  // Define containerRefs using useRef
  const containerRefs = useRef([]);

  const setContainerRef = (index, element) => {
    containerRefs.current[index] = element;
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        console.log("⏳ Refrescando datos:", new Date().toLocaleTimeString());
  
        const injectionValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.INJECTION);
        const stpValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.STP);
        const pfaValues = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.PFA);
        const issuesInjection = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.TOP_ISSUES);
        const issuesStp = await fetchGoogleSheetData(GOOGLE_SHEET_CONFIG.SHEET_NAMES.TOP_ISSUES_STP);
  
        const formatChartData = (values) => {
          if (values.length <= 1) return [];
          const headers = values[0];
          return values.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => obj[header] = row[index] || '');
            return {
              week: obj["DAY"] || `Dia`,
              dgrt: parseFloat(obj["DGTR"]) || 0,
              TGT: parseFloat(obj["TGT"]) || 0,
              dgrtDisplay: `${((parseFloat(obj["DGTR"]) || 0) * 100).toFixed(2)}%`,
              date: obj["DATE"] || null,
              machine: obj["MACHINE"] || "N/A"
            };
          });
        };
  
        const formatPFAData = (values) => {
          if (values.length <= 1) return [];
          const headers = values[0];
          return values.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => obj[header] = row[index] || '');
            return {
              week: obj["DAY"] || "Dia",
              dayShift: parseFloat(obj["DAY SHIFT"]) || 0,
              nightShift: parseFloat(obj["NIGHT SHIFT"]) || 0,
              tgt: parseFloat(obj["TGT"]) || 0
            };
          });
        };
  
        const formatTopIssues = (values) => {
          if (values.length <= 1) return [];
          const headers = values[0];
          return values.slice(1).map(row => {
            const obj = {};
            headers.forEach((header, index) => obj[header] = row[index] || '');
            return obj;
          });
        };
  
        setInjectionData(formatChartData(injectionValues));
        setStpData(formatChartData(stpValues));
        setDataPFA(formatPFAData(pfaValues));
        setTopIssuesInjection(formatTopIssues(issuesInjection));
        setTopIssuesStp(formatTopIssues(issuesStp));
      } catch (err) {
        console.error("Error cargando datos:", err);
      }
    };
  
    loadData(); // Llamada inicial
  
    const interval = setInterval(loadData, GOOGLE_SHEET_CONFIG.POLLING_INTERVAL || 60000);
    return () => clearInterval(interval);
  }, []);
  

  useEffect(() => {
    const interval = setInterval(() => {
      setFadeInjection(true);
      setFadeStp(true);
      setTimeout(() => {
        setTopIssuesInjection(prev => {
          const updated = [...prev];
          const first = updated.shift();
          return [...updated, first];
        });
        setTopIssuesStp(prev => {
          const updated = [...prev];
          const first = updated.shift();
          return [...updated, first];
        });
        setFadeInjection(false);
        setFadeStp(false);
      }, 500);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const renderSingleIssue = (issues, isFading) => {
    const total = issues.reduce((sum, issue) => sum + parseInt(issue.qty || issue.QTY || 0), 0);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100% - 40px)' }}>
        <div style={{ flex: 1, overflowY: 'auto', marginRight: '-8px', paddingRight: '8px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.6rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '6px' }}>DEFECT</th>
                <th style={{ textAlign: 'right', padding: '6px' }}>QTY</th>
              </tr>
            </thead>
            <tbody>
              {issues.map((issue, index) => (
                <tr
                  key={`${issue.defect || issue.DEFECT}-${index}`}
                  style={{
                    animation: isFading && index === 0 ? 'fadeOut 0.5s ease-in-out' : 'none',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
                  }}
                >
                  <td style={{
                    padding: '6px',
                    maxWidth: '120px',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {issue.defect || issue.DEFECT}
                  </td>
                  <td style={{ padding: '6px', textAlign: 'right' }}>
                    {issue.qty || issue.QTY}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div style={{ padding: '5px 10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', fontSize: '0.6rem' }}>
          <p>Total: {total}</p>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard">
      <div className="overlay"></div>
      <div className="content">
        <h1 className="title">QUALITY DASHBOARD</h1>
        <div className="last-updated">
          <span>Última actualización: {new Date().toLocaleTimeString()}</span>
          <button className="refresh-button" onClick={() => window.location.reload()}>Actualizar</button>
          <button className="refresh-button" onClick={() => window.location.href = "/"}>Dashboard</button>
        </div>

        <div className="second-row" style={{ gap: "10px", marginBottom: "10px" }}>
          <div className="glass-card" style={{ height: "190px", width: "50%" }}>
            <h3>DGTR INJECTION</h3>
            {injectionData.length > 0 ? (
              <div className="chart-container" style={{ height: "120px" }}>
                <ChartComponent 
                  data={injectionData}
                  multiLineKeys={["TGT", "dgrt"]}
                  colors={["red", "#4fc3f7"]}
                  showValues
                  valueFormatter={val => `${(val * 100).toFixed(2)}%`}
                  yAxisProps={{
                    domain: [0.75, 1],
                    ticks: [0.75, 0.8, 0.85, 0.9, 0.95, 1],
                    tickCount: 6
                  }}
                  dot={{ r: 2, fill: "#4fc3f7" }}
                />
              </div>
            ) : <p className="no-data">No hay datos</p>}
          </div>

          <div className="glass-card" style={{ height: "190px", width: "50%" }}>
            <h3>DGTR STAMPING</h3>
            {stpData.length > 0 ? (
              <div className="chart-container" style={{ height: "120px" }}>
                <ChartComponent 
                  data={stpData}
                  multiLineKeys={["TGT", "dgrt"]}
                  colors={["red", "#81C784"]}
                  showValues
                  valueFormatter={val => `${(val * 100).toFixed(2)}%`}
                  yAxisProps={{
                    domain: [0.75, 1],
                    ticks: [0.75, 0.8, 0.85, 0.9, 0.95, 1],
                    tickCount: 6
                  }}
                  dot={{ r: 2, fill: "#81C784" }}
                />
              </div>
            ) : <p className="no-data">No hay datos</p>}
          </div>
        </div>

        <div className="second-row" style={{ gap: "10px" }}>
          <div className="glass-card issues-card" style={{ width: '50%', height: '190px' }}>
            <h3>TOP ISSUES APRIL 2025 - INJECTION</h3>
            {topIssuesInjection.length > 0 ? (
              renderSingleIssue(topIssuesInjection, fadeInjection)
            ) : (
              <p style={{ padding: '10px' }}>No se encontraron datos</p>
            )}
          </div>

          <div className="glass-card issues-card" style={{ width: '50%', height: '190px' }}>
            <h3>TOP ISSUES APRIL 2025 - STAMPING</h3>
            {topIssuesStp.length > 0 ? (
              renderSingleIssue(topIssuesStp, fadeStp)
            ) : (
              <p style={{ padding: '10px' }}>No se encontraron datos</p>
            )}
          </div>
        </div>
        <div className="second-row" style={{ gap: "10px", marginTop: "10px" }}>
  {/* DGTR PFA DAY */}
  <div 
    ref={el => setContainerRef(1, el)}
    className="glass-card pfa-chart"
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

  {/* DGTR PFA NIGHT */}
  <div 
    ref={el => setContainerRef(1, el)}
    className="glass-card pfa-chart"
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
  );
}

export default GraficasOtroArea;
