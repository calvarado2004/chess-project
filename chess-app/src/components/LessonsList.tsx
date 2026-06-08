import { Link, useParams } from 'react-router-dom';
import { useTheory } from '../context/TheoryContext';
import { categories } from '../data';

export default function LessonsList() {
  const { categoryId } = useParams<{ categoryId: string }>();
  const { lessons, progress } = useTheory();
  const category = categories.find(c => c.id === categoryId);
  const catLessons = lessons.filter(l => l.category === categoryId);

  if (!category) {
    return (
      <div className="lessons-list">
        <h1>Category not found</h1>
        <Link to="/learn">← Back to Theory School</Link>
      </div>
    );
  }

  return (
    <div className="lessons-list">
      <div className="lessons-header">
        <Link to="/learn" className="back-link">← Back to Theory School</Link>
        <h1>
          <span className="category-icon">{category.icon}</span>
          {category.title}
        </h1>
        <p>{category.description}</p>
      </div>

      <div className="lessons-grid">
        {catLessons.map(lesson => {
          const lessonProgress = progress[lesson.id];
          const isCompleted = lessonProgress?.completed || false;
          const isInProgress = lessonProgress?.lastPositionIndex > 0 && !isCompleted;

          return (
            <Link
              key={lesson.id}
              to={`/learn/lesson/${lesson.id}`}
              className={`lesson-card ${isCompleted ? 'completed' : ''} ${isInProgress ? 'in-progress' : ''}`}
            >
              <div className="lesson-card-header">
                <span className="lesson-difficulty">{lesson.difficulty}</span>
                {isCompleted && <span className="lesson-badge completed">✓ Completed</span>}
                {isInProgress && <span className="lesson-badge in-progress">In Progress</span>}
              </div>

              <h3>{lesson.title}</h3>
              <p className="lesson-description">{lesson.description}</p>

              <div className="lesson-meta">
                <span className="lesson-time">⏱ ~{lesson.estimatedMinutes} min</span>
                <span className="lesson-concepts">{lesson.keyConcepts.length} concepts</span>
              </div>

              <div className="lesson-progress">
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{
                      width: `${lessonProgress ? Math.min(100, ((lessonProgress.lastPositionIndex + 1) / (lesson.sections?.length || 1)) * 100) : 0}%`,
                      backgroundColor: isCompleted ? '#a6e3a1' : '#89b4fa',
                    }}
                  />
                </div>
                <span className="progress-text">
                  {lessonProgress ? `${lessonProgress.lastPositionIndex + 1}/${lesson.sections?.length || 1}` : 'Not started'}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
