import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

const GaussianChart = ({ curveData, rawData, stats, percentiles, isSmall }) => {
  const { mean, stdDev, upperLimit, lowerLimit } = stats;
  
  const chartConfig = {
    height: isSmall ? 250 : 280,
    fontSize: isSmall ? 12 : 12,
    lineWidth: isSmall ? 3 : 2,
    margin: isSmall ? { top: 8, right: 0, left: 0, bottom: 5 } : { top: 5, right: 5, left: 10, bottom: 10 }
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <ResponsiveContainer width="100%" height={chartConfig.height}>
        <LineChart
          data={curveData}
          margin={chartConfig.margin}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          
          <XAxis
            dataKey="x"
            tick={{ fontSize: chartConfig.fontSize, fill: '#aaa' }}
            axisLine={{ stroke: '#ccc' }}
            tickFormatter={(value) => value.toFixed(0)}
          />
          
          <YAxis
            tick={{ fontSize: chartConfig.fontSize, fill: '#aaa' }}
            axisLine={{ stroke: '#ccc' }}
          />
          
          <Tooltip
            contentStyle={{
              background: 'rgba(30, 30, 30, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '4px'
            }}
            formatter={(value) => [value.toFixed(10), 'Densidad']}
            labelFormatter={(label) => `Valor: ${label.toFixed(4)}`}
          />
          
          <Line
            type="monotone"
            dataKey="y"
            stroke="#4fc3f7"
            dot={false}
            strokeWidth={chartConfig.lineWidth}
            name="Distribución"
          />
          
          {!isSmall && (
            <>
              <ReferenceLine x={mean} stroke="#4CAF50" label={{ value: 'Media', position: 'top' }} />
              <ReferenceLine x={upperLimit} stroke="#F44336" label={{ value: 'Lím Sup', position: 'top' }} />
              <ReferenceLine x={lowerLimit} stroke="#F44336" label={{ value: 'Lím Inf', position: 'bottom' }} />
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default GaussianChart;