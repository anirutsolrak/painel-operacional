import React, { useRef, useEffect } from 'react';
import Chart from 'chart.js/auto';

function DoughnutChart({
    data,
    title,
    colors = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#6b7280'],
    showOverachievement = false
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

        // Handle overachievement for goal charts
        let chartData = [...data];
        if (showOverachievement && data[0]?.label === 'Realizado' && data[0]?.value > 100) {
            // Split into base 100% and overachievement
            chartData = [
                { label: 'Meta Base', value: 100, color: '#10b981' }, // Green for base
                { label: 'Superação', value: data[0].value - 100, color: '#f97316' }, // Orange for overachievement
                { label: 'Restante', value: 0, color: '#e5e7eb' } // Gray for remaining (will be 0)
            ];
        }

        const timeoutId = setTimeout(() => {
            if (!chartRef.current) return;
            
            chartInstance.current = new Chart(ctx, {
                type: 'doughnut',
                data: {
                    labels: chartData.map(d => d.label),
                    datasets: [{
                        label: title,
                        data: chartData.map(d => d.value),
                        backgroundColor: chartData.map((d, i) => d.color || colors[i % colors.length]),
                        hoverOffset: 4,
                        borderWidth: 1,
                    }]
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
                                label: function(context) {
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
    }, [data, title, colors, showOverachievement]);

    if (!data || data.length === 0) {
        return null;
    }

    return <canvas ref={chartRef}></canvas>;
}

export default DoughnutChart;