import React from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

const ChartComponent = ({ data, dataKey, color, multiLineKeys = [], colors = [] }) => {
  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        
        {/* Eje X con Label */}
        <XAxis dataKey="week" label={{ value: "Semana/Week", position: "insideBottom", offset: -2,  style: { fontSize: "10px", fontWeight: "bold" }  }} />

        {/* Eje Y con Label */}
        <YAxis label={{ value: "Valor/Value", angle: -90,offset: -2, position: "insideLeft",  style: { fontSize: "10px", fontWeight: "bold"}
      }} />

        <Tooltip />
        <Legend />

        {/* Línea simple */}
        {dataKey && <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 3 }} />}

        {/* Múltiples líneas */}
        {multiLineKeys.length > 0 &&
          multiLineKeys.map((key, index) => (
            <Line key={key} type="monotone" dataKey={key} stroke={colors[index]} strokeWidth={2} dot={{ r: 3 }} />
          ))}
      </LineChart>
    </ResponsiveContainer>
  );
};

export default ChartComponent;
