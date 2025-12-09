import { useState, useMemo } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { Card } from '@/components/ui/Card';
import { formatDate, daysUntil } from '@/lib/utils';
import { addDays, differenceInDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, eachWeekOfInterval, format, isToday, isSameDay, isWithinInterval } from 'date-fns';

const STATUS_COLORS = {
  in_progress: { bar: 'bg-blue-500', light: 'bg-blue-100' },
  review: { bar: 'bg-yellow-500', light: 'bg-yellow-100' },
  complete: { bar: 'bg-green-500', light: 'bg-green-100' },
};

const PHASE_COLORS = {
  'Discovery': 'bg-purple-400',
  'Development': 'bg-blue-400',
  'Review': 'bg-yellow-400',
  'Complete': 'bg-green-400',
  'default': 'bg-gray-400',
};

export function Timeline() {
  const [viewScale, setViewScale] = useState('month'); // 'week' | 'month' | 'quarter'
  const { projects, getProjectsForTimeline, getUpcomingMilestones } = useProjects();

  // Get projects with valid timeline data
  const timelineProjects = useMemo(() => {
    return getProjectsForTimeline();
  }, [projects]);

  // Calculate timeline range
  const timelineRange = useMemo(() => {
    if (timelineProjects.length === 0) {
      const today = new Date();
      return {
        start: startOfMonth(today),
        end: endOfMonth(addDays(today, 60)),
      };
    }

    const dates = timelineProjects.flatMap(p => [
      new Date(p.start_date),
      new Date(p.deadline),
    ]);
    
    const minDate = new Date(Math.min(...dates));
    const maxDate = new Date(Math.max(...dates));
    
    // Add padding
    return {
      start: startOfWeek(addDays(minDate, -7)),
      end: endOfWeek(addDays(maxDate, 14)),
    };
  }, [timelineProjects]);

  // Generate time columns based on view scale
  const timeColumns = useMemo(() => {
    const { start, end } = timelineRange;
    
    if (viewScale === 'week') {
      return eachDayOfInterval({ start, end }).map(date => ({
        date,
        label: format(date, 'd'),
        subLabel: format(date, 'EEE'),
        isToday: isToday(date),
      }));
    } else if (viewScale === 'month') {
      return eachWeekOfInterval({ start, end }).map(date => ({
        date,
        label: format(date, 'MMM d'),
        subLabel: '',
        isToday: isWithinInterval(new Date(), { start: date, end: addDays(date, 6) }),
      }));
    } else {
      // Quarter view - show months
      const months = [];
      let current = start;
      while (current <= end) {
        months.push({
          date: current,
          label: format(current, 'MMM'),
          subLabel: format(current, 'yyyy'),
          isToday: isWithinInterval(new Date(), { start: startOfMonth(current), end: endOfMonth(current) }),
        });
        current = addDays(endOfMonth(current), 1);
      }
      return months;
    }
  }, [timelineRange, viewScale]);

  // Calculate bar position and width for each project
  const getBarStyle = (project) => {
    const { start, end } = timelineRange;
    const totalDays = differenceInDays(end, start);
    
    const projectStart = new Date(project.start_date);
    const projectEnd = new Date(project.deadline);
    
    const startOffset = Math.max(0, differenceInDays(projectStart, start));
    const projectDuration = differenceInDays(projectEnd, projectStart) + 1;
    
    const leftPercent = (startOffset / totalDays) * 100;
    const widthPercent = Math.min((projectDuration / totalDays) * 100, 100 - leftPercent);
    
    return {
      left: `${leftPercent}%`,
      width: `${Math.max(widthPercent, 2)}%`,
    };
  };

  // Calculate milestone position
  const getMilestonePosition = (date) => {
    const { start, end } = timelineRange;
    const totalDays = differenceInDays(end, start);
    const milestoneDate = new Date(date);
    const offset = differenceInDays(milestoneDate, start);
    return `${(offset / totalDays) * 100}%`;
  };

  // Get today line position
  const getTodayPosition = () => {
    const { start, end } = timelineRange;
    const totalDays = differenceInDays(end, start);
    const today = new Date();
    const offset = differenceInDays(today, start);
    if (offset < 0 || offset > totalDays) return null;
    return `${(offset / totalDays) * 100}%`;
  };

  const todayPosition = getTodayPosition();
  const upcomingMilestones = getUpcomingMilestones(30);

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 tracking-tight">Timeline</h2>
          <p className="text-gray-500 mt-1">Visualize project schedules and milestones.</p>
        </div>

        {/* View Scale Toggle */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          {[
            { id: 'week', label: 'Week' },
            { id: 'month', label: 'Month' },
            { id: 'quarter', label: 'Quarter' },
          ].map(scale => (
            <button
              key={scale.id}
              onClick={() => setViewScale(scale.id)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all duration-200 ${
                viewScale === scale.id
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              {scale.label}
            </button>
          ))}
        </div>
      </div>

      {/* Upcoming Milestones */}
      {upcomingMilestones.length > 0 && (
        <Card className="p-4">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Upcoming Milestones (30 days)</h3>
          <div className="flex flex-wrap gap-2">
            {upcomingMilestones.slice(0, 5).map((milestone, i) => (
              <div
                key={`${milestone.project_id}-${milestone.id}-${i}`}
                className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg text-sm"
              >
                <span className="w-2 h-2 rounded-full bg-primary-500" />
                <span className="font-medium text-gray-900">{milestone.name}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-500">{milestone.project_name}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-600">{formatDate(milestone.date)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Gantt Chart */}
      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            {/* Timeline Header */}
            <div className="flex border-b border-gray-200 bg-gray-50">
              {/* Project Names Column */}
              <div className="w-64 shrink-0 p-4 font-medium text-gray-700 text-sm border-r border-gray-200">
                Projects
              </div>
              
              {/* Time Columns */}
              <div className="flex-1 flex relative">
                {timeColumns.map((col, i) => (
                  <div
                    key={i}
                    className={`flex-1 text-center py-2 px-1 text-xs border-r border-gray-100 ${
                      col.isToday ? 'bg-primary-50' : ''
                    }`}
                  >
                    <div className="font-medium text-gray-700">{col.label}</div>
                    {col.subLabel && (
                      <div className="text-gray-400">{col.subLabel}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Project Rows */}
            <div className="relative">
              {/* Today Line */}
              {todayPosition && (
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20 pointer-events-none"
                  style={{ left: `calc(256px + (100% - 256px) * ${parseFloat(todayPosition) / 100})` }}
                >
                  <div className="absolute -top-1 -left-2 bg-red-500 text-white text-[10px] px-1 rounded">
                    Today
                  </div>
                </div>
              )}

              {timelineProjects.length === 0 ? (
                <div className="p-12 text-center text-gray-400">
                  <div className="text-4xl mb-4">📅</div>
                  <p>No projects with timeline data.</p>
                  <p className="text-sm mt-2">Add start dates and deadlines to your projects to see them here.</p>
                </div>
              ) : (
                timelineProjects.map((project, index) => (
                  <div
                    key={project.id}
                    className={`flex border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'
                    }`}
                  >
                    {/* Project Info */}
                    <div className="w-64 shrink-0 p-4 border-r border-gray-200">
                      <div className="font-medium text-gray-900 truncate">{project.name}</div>
                      <div className="text-xs text-gray-500 truncate">{project.client}</div>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          project.status === 'complete' ? 'bg-green-100 text-green-700' :
                          project.status === 'review' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        }`}>
                          {project.phase || project.status}
                        </span>
                      </div>
                    </div>

                    {/* Timeline Bar */}
                    <div className="flex-1 relative py-4 px-2">
                      {/* Project Bar */}
                      <div
                        className={`absolute h-8 rounded-lg ${STATUS_COLORS[project.status]?.bar || 'bg-gray-400'} shadow-sm flex items-center px-2 overflow-hidden`}
                        style={getBarStyle(project)}
                      >
                        <span className="text-xs text-white font-medium truncate">
                          {project.name}
                        </span>
                      </div>

                      {/* Milestones */}
                      {project.milestones?.map((milestone, mIndex) => {
                        const milestonePos = getMilestonePosition(milestone.date);
                        const posPercent = parseFloat(milestonePos);
                        if (posPercent < 0 || posPercent > 100) return null;
                        
                        return (
                          <div
                            key={milestone.id || mIndex}
                            className="absolute top-1/2 -translate-y-1/2 z-10 group"
                            style={{ left: milestonePos }}
                          >
                            <div
                              className={`w-3 h-3 rotate-45 ${
                                milestone.completed ? 'bg-green-500' : 'bg-orange-500'
                              } border-2 border-white shadow-sm cursor-pointer`}
                            />
                            {/* Tooltip */}
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-30">
                              <div className="bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                {milestone.name}
                                <br />
                                <span className="text-gray-300">{formatDate(milestone.date)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm text-gray-600">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-blue-500" />
          <span>In Progress</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-500" />
          <span>Review</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span>Complete</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rotate-45 bg-orange-500" />
          <span>Upcoming Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rotate-45 bg-green-500" />
          <span>Completed Milestone</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-0.5 h-4 bg-red-500" />
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}



