use serde::Deserialize;
use std::{collections::HashMap, sync::Mutex};

#[derive(Clone, Deserialize)]
pub struct Reminder {
    pub id: String,
    pub at: u64,
    pub title: String,
    pub body: String,
}
#[derive(Default)]
pub struct Queue {
    pub jobs: Vec<Reminder>,
    pub sent: HashMap<String, u64>,
    pub last_error: Option<String>,
}
pub struct Reminders(pub Mutex<Queue>);

impl Queue {
    pub fn due(&mut self, now: u64) -> Vec<Reminder> {
        self.sent.retain(|_, at| now.saturating_sub(*at) < 86400);
        self.jobs.iter().filter(|job| job.at <= now && now.saturating_sub(job.at) <= 300 && !self.sent.contains_key(&job.id)).cloned().collect()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn job(id: &str, at: u64) -> Reminder { Reminder { id: id.into(), at, title: "Focus".into(), body: "Start".into() } }
    #[test]
    fn only_delivers_recent_due_unsent_jobs() {
        let mut queue = Queue { jobs: vec![job("stale", 1), job("due", 1000), job("future", 1100)], ..Default::default() };
        let due = queue.due(1020);
        assert_eq!(due.len(), 1);
        assert_eq!(due[0].id, "due");
        queue.sent.insert("due".into(), 1000);
        assert!(queue.due(1030).is_empty());
    }
}
