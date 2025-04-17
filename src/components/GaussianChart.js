import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Label 
} from "recharts";

const GaussianChart = ({ curveData, stats, isSmall }) => {
  const { mean, upperLimit, lowerLimit } = stats;

  // Configuración optimizada para el contenedor de 280px
  const chartConfig = {
    height: 230,  // Ajustado para 280px contenedor (-40px de márgenes)
    fontSize: 10,
    margin: { top: 25, right: 25, left: 25, bottom: 35 },
    lineWidth: 2
  };

  // Encontrar el punto Y más alto para posicionamiento inteligente
  const maxYValue = Math.max(...curveData.map(d => d.y));
  const maxYPoint = curveData.find(d => d.y === maxYValue);

  return (
    <ResponsiveContainer width="100%" height={chartConfig.height}>
      <LineChart 
        data={curveData} 
        margin={chartConfig.margin}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
        
        <XAxis
          dataKey="x"
          type="number"
          domain={[
          Math.min(lowerLimit, mean) - 0.1, 
          Math.max(upperLimit, mean) + 0.1
          ]}
          tick={{ fontSize: chartConfig.fontSize, fill: '#aaa' }}
          axisLine={{ stroke: '#ccc' }}
          tickFormatter={(value) => value.toFixed(2)}
        />
        
        <YAxis
          tick={{ fontSize: chartConfig.fontSize, fill: '#aaa' }}
          axisLine={{ stroke: '#ccc' }}
          width={30}
        />
        
        <Tooltip
          formatter={(value, name) => [value.toFixed(4), name]}
          labelFormatter={(label) => `Valor: ${label.toFixed(2)}`}
          contentStyle={{
            background: 'rgba(30, 30, 30, 0.95)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '6px'
          }}
        />
        
        {/* Curva Gaussiana */}
        <Line
          type="monotone"
          dataKey="y"
          stroke="#4fc3f7"
          dot={false}
          strokeWidth={chartConfig.lineWidth}
          isAnimationActive={false}
        />

        {/* MEDIA (Posicionamiento inteligente) */}
        <ReferenceLine
          x={mean}
          stroke="#4CAF50"
          strokeWidth={2}
        >
          <Label 
            value={`Media: ${mean.toFixed(2)}`}
            position={Math.abs(mean - maxYPoint.x) < 0.01 ? 'top' : 'insideTop'}
            fill="#4CAF50"
            fontSize={chartConfig.fontSize}
            offset={8}
          />
        </ReferenceLine>

        {/* LÍMITE INFERIOR (Posición fija) */}
        <ReferenceLine
          x={lowerLimit}
          stroke="#F44336"
          strokeDasharray="5 5"
        >
          <Label 
            value={`Lím Inf: ${lowerLimit.toFixed(2)}`}
            position="insideBottomLeft"
            fill="#F44336"
            fontSize={chartConfig.fontSize}
            offset={5}
          />
        </ReferenceLine>

        {/* LÍMITE SUPERIOR (Posición fija) */}
        <ReferenceLine
          x={upperLimit}
          stroke="#F44336"
          strokeDasharray="5 5"
        >
          <Label 
            value={`Lím Sup: ${upperLimit.toFixed(2)}`}
            position="insideTopRight"
            fill="#F44336"
            fontSize={chartConfig.fontSize}
            offset={5}
          />
        </ReferenceLine>
      </LineChart>
    </ResponsiveContainer>
  );
};


export default GaussianChart;