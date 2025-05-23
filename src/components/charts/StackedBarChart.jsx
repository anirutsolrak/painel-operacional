import React, { useEffect, useRef } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function StackedBarChart({ data, title, keys, colors, horizontal = true }) {
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    useEffect(() => {
        if (!chartRef.current || !data || data.length === 0) {
            if (chartInstance.current) {
                chartInstance.current.destroy();
                chartInstance.current = null;
            }
            return;
        }

        const ctx = chartRef.current.getContext('2d');

        if (chartInstance.current) {
            chartInstance.current.destroy();
        }

        const labels = data.map(d => d.label);
        const datasets = keys.map((key, index) => ({
            label: key.label,
            data: data.map(d => d[key.valueKey]),
            backgroundColor: colors[index % colors.length],
            borderColor: 'white',
            borderWidth: 1,
        }));

        chartInstance.current = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: horizontal ? 'y' : 'x',
                plugins: {
                    title: {
                        display: title ? true : false,
                        text: title,
                        font: { size: 16 }
                    },
                    legend: {
                        position: 'top',
                    },
                },
                scales: {
                    x: {
                        stacked: true,
                        title: {
                            display: !horizontal,
                            text: 'Contagem'
                        }
                    },
                    y: {
                        stacked: true,
                        title: {
                            display: horizontal,
                            text: 'Tipo de Tabulação'
                        }
                    }
                }
            },
        });

        return () => {
            if (chartInstance.current) {
                chartInstance.current.destroy();
            }
        };
    }, [data, title, keys, colors, horizontal]);

    return <canvas ref={chartRef}></canvas>;
}

export default StackedBarChart;