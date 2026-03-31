import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions } from 'react-native';
import { VictoryBar, VictoryPie, VictoryChart, VictoryTheme, VictoryAxis } from 'victory-native';
import { useHabits } from '../context/HabitContext';
import { isDueToday, isDone, getStreak } from '../utils/streaks';
import { today, addDays, daysBetween } from '../utils/dates';

const { width } = Dimensions.get('window');

const AnalyticsScreen = () => {
  const { habits, entries } = useHabits();
  const [rangeFrom, setRangeFrom] = useState(addDays(today(), -6));
  const [rangeTo, setRangeTo] = useState(today());

  const active = habits.filter(h => !h.archived);

  // Weekly completion data (last 7 days)
  const weeklyData = [];
  for (let i = 6; i >= 0; i--) {
    const date = addDays(today(), -i);
    let due = 0, done = 0;
    active.forEach(habit => {
      if (isDueToday(habit, date)) {
        due++;
        if (isDone(habit.id, entries, date)) done++;
      }
    });
    const rate = due === 0 ? 0 : (done / due) * 100;
    weeklyData.push({ day: date.slice(5), rate });
  }

  // Category distribution
  const categoryCount: Record<string, number> = {};
  active.forEach(h => {
    categoryCount[h.category] = (categoryCount[h.category] || 0) + 1;
  });
  const categoryData = Object.entries(categoryCount).map(([cat, count]) => ({ category: cat, count }));

  // Top streaks
  const streaks = active.map(h => ({
    name: h.name.slice(0, 12),
    streak: getStreak(h.id, entries, habits),
  })).sort((a, b) => b.streak - a.streak).slice(0, 5);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Weekly Completion Rate</Text>
        <VictoryChart domainPadding={20} width={width - 32} height={250}>
          <VictoryAxis tickValues={weeklyData.map(d => d.day)} tickFormat={d => d} />
          <VictoryAxis dependentAxis tickFormat={(t) => `${t}%`} />
          <VictoryBar data={weeklyData} x="day" y="rate" style={{ data: { fill: '#0d9668' } }} />
        </VictoryChart>
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Habits by Category</Text>
        <VictoryPie
          data={categoryData}
          x="category"
          y="count"
          colorScale={['#0d9668', '#e6a817', '#6366f1', '#ec4899', '#f97316']}
          width={width - 32}
          height={250}
          labelRadius={({ innerRadius }) => {
            const radius = typeof innerRadius === 'number' ? innerRadius : 0;
            return radius + 30;
          }}
          style={{ labels: { fontSize: 12, fill: '#2d2d2d' } }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.title}>Top Streaks</Text>
        <VictoryBar
          data={streaks}
          x="name"
          y="streak"
          horizontal
          style={{ data: { fill: '#e6a817' } }}
          width={width - 32}
          height={streaks.length * 40}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, backgroundColor: '#f0f4f3' },
  card: { backgroundColor: 'rgba(255,255,255,0.82)', borderRadius: 20, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(13,150,104,0.12)' },
  title: { fontSize: 16, fontWeight: 'bold', marginBottom: 12 },
});

export default AnalyticsScreen;
