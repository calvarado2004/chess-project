import { Link } from 'react-router-dom';
import { useTheory } from '../context/TheoryContext';
import { categories } from '../data';

export default function Learn() {
  const { lessons, progress } = useTheory();

  const stats = {
    total: lessons.length,
    completed: Object.values(progress).filter(p => p.completed).length,
    inProgress: Object.values(progress).filter(p => !p.completed && p.lastPositionIndex > 0).length,
  };

  return (
    <div className="theory-school">
      <div className="theory-hero">
        <h1>♟ Chess Theory School</h1>
        <p>Master chess from openings to endings with interactive lessons and exercises.</p>
        
        <div className="theory-stats">
          <div className="stat-card">
            <span className="stat-value">{stats.total}</span>
            <span className="stat-label">Lessons</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.completed}</span>
            <span className="stat-label">Completed</span>
          </div>
          <div className="stat-card">
            <span className="stat-value">{stats.inProgress}</span>
            <span className="stat-label">In Progress</span>
          </div>
        </div>
      </div>

      <div className="theory-categories">
        {categories.map(cat => {
          const catLessons = lessons.filter(l => l.category === cat.id);
          const completedCount = catLessons.filter(l => progress[l.id]?.completed).length;

          return (
            <div key={cat.id} className="category-card">
              <div className="category-header">
                <span className="category-icon">{cat.icon}</span>
                <div>
                  <h2>{cat.title}</h2>
                  <p>{cat.description}</p>
                </div>
              </div>

              <div className="category-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${catLessons.length ? (completedCount / catLessons.length) * 100 : 0}%`,
                      backgroundColor: cat.color,
                    }}
                  />
                </div>
                <span className="progress-text">{completedCount}/{catLessons.length} completed</span>
              </div>

              <Link to={`/learn/${cat.id}`} className="view-lessons-btn">
                View {catLessons.length} Lessons →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}
