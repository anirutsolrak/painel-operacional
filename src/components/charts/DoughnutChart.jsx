import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';


function DoughnutChart({
    data,
    title,
    colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6b7280'],
  }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);
  
    useEffect(() => {
      if (!data || data.length === 0 || !chartRef.current) {
          if (chartInstance.current) {
             chartInstance.current.destroy();
             chartInstance.current = null;
          }
          return;
      }
      const ctx = chartRef.current.getContext('2d');
      if (!ctx) return;
  
      if (chartInstance.current) {
        chartInstance.current.destroy();
        chartInstance.current = null;
      }
  
      const timeoutId = setTimeout(() => {
        if (!chartRef.current) return;
  
        chartInstance.current = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: data.map((d) => d.label),
            datasets: [
              {
                label: title,
                data: data.map((d) => d.value),
                backgroundColor: colors.slice(0, data.length),
                hoverOffset: 4,
                borderWidth: 1,
              },
            ],
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '60%',
            animation: {
              duration: 1000,
              delay: 800,
            },
            plugins: {
              legend: {
                position: 'bottom',
                labels: {
                  boxWidth: 12,
                  font: { size: 10 },
                },
              },
              title: {
                display: !!title,
                text: title,
                font: { size: 12 },
                padding: { top: 5, bottom: 5 },
              },
              tooltip: {
                callbacks: {
                  label: function (context) {
                    let label = context.label || '';
                    if (label) {
                      label += ': ';
                    }
                    if (context.parsed !== null) {
                      label += context.parsed.toLocaleString('pt-BR');
                    }
                    return label;
                  },
                },
              },
            },
          },
        });
      }, 600);
  
      return () => {
        clearTimeout(timeoutId);
        if (chartInstance.current) {
          chartInstance.current.destroy();
          chartInstance.current = null;
        }
      };
    }, [data, title, colors]);
  
    if (!data || data.length === 0) {
         return null;
    }
  
    return <canvas ref={chartRef}></canvas>;
  }

  export default DoughnutChart