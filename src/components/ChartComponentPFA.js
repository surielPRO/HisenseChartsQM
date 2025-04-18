import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid, LabelList } from "recharts";

const ChartComponentPFA = ({ data, multiLineKeys = [], colors = [] }) => {
  const formatPercentage = (value) => `${(value).toFixed(2)}%`;

  return (
    <ResponsiveContainer width="100%" height={190}>
      <LineChart 
        data={data}
        margin={{ top: 25, right: 30, left: 30, bottom: 30 }}
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
          label={{
            value: "Porcentaje (%)",
            angle: -90,
            offset: -0,
            position: "insideLeft",
            style: {
              fontSize: 9,
              fontWeight: "bold",
              fill: "#ffffff"
            }
          }}
          tickFormatter={formatPercentage}
          tick={{ fontSize: 8 }}
        />

        <Tooltip
          formatter={(value, name) => [formatPercentage(value), name]}
          labelFormatter={(label) => `Semana: ${label}`}
          contentStyle={{
            background: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px',
            padding: '2px'
          }}
        />

        <Legend 
          wrapperStyle={{ paddingTop: '20px' }}
          iconSize={5}
          iconType="circle"
        />

        {/* Línea de tgt al fondo */}
        {multiLineKeys.includes('tgt') && (
          <Line
            key="tgt"
            type="monotone"
            dataKey="tgt"
            stroke="#ff0707"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            name="Meta"
          />
        )}

        {/* Líneas encima de tgt, con etiquetas visibles */}
        {multiLineKeys.filter(key => key !== 'tgt').map((key, index) => (
          <Line
            key={key}
            type="monotone"
            dataKey={key}
            stroke={colors[index]}
            strokeWidth={1.5}
            dot={{ r: 3 }}
            name={key === 'dayShift' ? 'Turno Día' : 
                  key === 'nightShift' ? 'Turno Noche' : key}
          >
            <LabelList
              dataKey={key}
              content={({ x, y, value }) => (
                <text 
                  x={x} 
                  y={y - 8} // Asegura que esté sobre la línea
                  dy={-5}
                  fill={colors[index]}
                  fontSize={7}
                  fontWeight="bold"
                  textAnchor="middle"
                >
                  {formatPercentage(value)}
                </text>
              )}
            />
          </Line>
        ))}

        {multiLineKeys.includes('tgt') && data.length > 0 && data[0].tgt !== undefined && (
          <text 
            x={600} 
            y={145} 
            fill="#ff0707" 
            fontSize={10}
            fontWeight="bold"
          >
           - - - - 
          | Target  : {formatPercentage(data[0].tgt)}
          </text>
        )}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartComponentPFA;
