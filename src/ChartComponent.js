import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";

const ChartComponent = ({ data, dataKey, color, multiLineKeys = [], colors = [], yAxisProps = {} }) => {

  const formatPercentage = (value) => `${(value * 100).toFixed(2)}%`;

  // Configuración responsive mejorada
  const getLabelStyle = (index) => ({
    fontSize: 8,
    fill: colors[index] || color,
    angle: -45,
    textAnchor: 'middle',
    dominantBaseline: 'middle',
    fontWeight: 'bold'
  });                       

  return (
    <ResponsiveContainer width="100%" height={190}> {/* Aumenta la altura */}
      <LineChart 
        data={data}
        margin={{ top: 25, right: 30, left: 30, bottom: 40 }}
        
      >
        
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        
        <XAxis
          dataKey="week"
          label={{
            value: "Semana/Week",
            position: "insideBottom",
            offset: 0,
            style: {
              fontSize: 10,
              fontWeight: "bold",
              fill: "#ffffff"
            }
          }}
          tick={{ fontSize: 7 }}
        />

        <YAxis
          domain={[0.75, 1]} // De 75% a 100%
          ticks={[0.75, 0.80, 0.85, 0.90, 0.95, 1]} // Incrementos de 5%
          tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} // Mostrar como 75%, 80%, etc.
          tick={{ fontSize: 8 }}
          allowDataOverflow={true}
          label={{
            value: "DGTR (%)",
            angle: -90,
            position: "insideLeft",
            style: { fontSize: 9, fontWeight: "bold", fill: "#ffffff" }
          }}
        />

<Tooltip
  formatter={(value, name) => {
    const displayName =
      name === 'TGT' ? 'Meta' :
      name === 'dgrt' ? 'DGTR' : name;
    return [formatPercentage(value), displayName];
  }}
  labelFormatter={(label) => `Semana: ${label}`}
  contentStyle={{
    background: 'rgba(30, 30, 30, 0.95)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    padding: '2px'
  }}
/>


        <Legend 
          wrapperStyle={{ paddingTop: '20   px' }}
          iconSize={5}
          iconType="circle"
        />

        {multiLineKeys.length > 0 ? (
          multiLineKeys.map((key, index) => (
            <Line
              key={key}
              type="monotone"
              dataKey={key}
              stroke={colors[index]}
              strokeWidth={1.5}
              dot={{ r: 2 }}
              name={key === 'dayShift' ? 'Turno Día' : 
                    key === 'nightShift' ? 'Turno Noche' : 
                    key === 'tgt' ? 'Meta' : 
                    key === 'dgrt' ? 'DGTR' : key}
            strokeDasharray={key === 'TGT' ? '4 4' : undefined}
            >
             {key !== 'TGT' && (
  <LabelList
    dataKey={key}
    content={({ x, y, value }) => (
      <text 
        x={x} 
        y={y - 12} 
        dy={-5}
        fill={colors[index]}
        fontSize={7}
        textAnchor="middle"
        angle={-45}
      >
        {formatPercentage(value)}
      </text>
    )}
  />
)}

            </Line>
          ))
        ) : (
          <Line
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            strokeWidth={3}
            dot={{ r: 4 }}
           
          >
            <LabelList
              dataKey={dataKey}
              position="top"
              formatter={formatPercentage}
              fill={color}
              fontSize={8}
              offset={8}
            />
          </Line>
        )}
      {/* Mostrar meta flotante solo si "TGT" está presente en los datos */}
{data.length > 0 && data[0].TGT !== undefined && (
  <text 
    x={1370}  // Ajusta la posición horizontal
    y={150}   // Ajusta la posición vertical
    fill="#ff0707" 
    fontSize={10}
    fontWeight="bold"
  >
    - - - -   |   Meta: {formatPercentage(data[0].TGT)}
  </text>
)}


      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartComponent;