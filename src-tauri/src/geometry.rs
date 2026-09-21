use serde::{Deserialize, Serialize};

#[derive(Clone, Copy, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Rect {
    pub x: i32,
    pub y: i32,
    pub width: u32,
    pub height: u32,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct Screen {
    pub bounds: Rect,
    pub work_area: Rect,
}

const FIRST_LAUNCH_RATIO: f64 = 0.8;

impl Rect {
    pub fn new(x: i32, y: i32, width: u32, height: u32) -> Rect {
        Rect { x, y, width, height }
    }

    fn right(&self) -> i32 {
        self.x + self.width as i32
    }

    fn bottom(&self) -> i32 {
        self.y + self.height as i32
    }

    fn is_empty(&self) -> bool {
        self.width == 0 || self.height == 0
    }

    fn intersects(&self, other: &Rect) -> bool {
        self.x < other.right()
            && other.x < self.right()
            && self.y < other.bottom()
            && other.y < self.bottom()
    }

    fn contains(&self, x: i32, y: i32) -> bool {
        x >= self.x && x < self.right() && y >= self.y && y < self.bottom()
    }

    fn centered_in(width: u32, height: u32, area: &Rect) -> Rect {
        Rect::new(
            area.x + (area.width as i32 - width as i32) / 2,
            area.y + (area.height as i32 - height as i32) / 2,
            width,
            height,
        )
    }
}

pub fn place(remembered: Option<Rect>, screens: &[Screen], cursor: (i32, i32)) -> Option<Rect> {
    let remembered = remembered.filter(|r| !r.is_empty());
    if let Some(rect) = remembered {
        if screens.iter().any(|s| rect.intersects(&s.work_area)) {
            return Some(rect);
        }
    }
    let area = screens
        .iter()
        .find(|s| s.bounds.contains(cursor.0, cursor.1))
        .or_else(|| screens.first())?
        .work_area;
    let (width, height) = match remembered {
        Some(rect) => (rect.width.min(area.width), rect.height.min(area.height)),
        None => (
            (area.width as f64 * FIRST_LAUNCH_RATIO) as u32,
            (area.height as f64 * FIRST_LAUNCH_RATIO) as u32,
        ),
    };
    Some(Rect::centered_in(width, height, &area))
}

#[cfg(test)]
mod tests {
    use super::*;

    const MAIN: Screen = Screen {
        bounds: Rect { x: 0, y: 0, width: 2000, height: 1040 },
        work_area: Rect { x: 0, y: 40, width: 2000, height: 1000 },
    };
    const SECONDARY: Screen = Screen {
        bounds: Rect { x: 2000, y: -200, width: 1000, height: 800 },
        work_area: Rect { x: 2000, y: -200, width: 1000, height: 800 },
    };

    #[test]
    fn visible_rect_is_returned_intact() {
        let remembered = Rect::new(100, 100, 800, 600);
        assert_eq!(place(Some(remembered), &[MAIN], (0, 0)), Some(remembered));
    }

    #[test]
    fn partially_visible_rect_is_kept() {
        let remembered = Rect::new(1900, 900, 800, 600);
        assert_eq!(place(Some(remembered), &[MAIN], (0, 0)), Some(remembered));
    }

    #[test]
    fn offscreen_rect_is_centered_on_cursor_work_area_with_same_size() {
        let remembered = Rect::new(5000, 5000, 800, 600);
        assert_eq!(
            place(Some(remembered), &[MAIN], (10, 10)),
            Some(Rect::new(600, 240, 800, 600))
        );
    }

    #[test]
    fn offscreen_rect_larger_than_fallback_work_area_is_clamped() {
        let remembered = Rect::new(5000, 5000, 3000, 1500);
        assert_eq!(
            place(Some(remembered), &[MAIN], (10, 10)),
            Some(Rect::new(0, 40, 2000, 1000))
        );
    }

    #[test]
    fn empty_rect_is_treated_as_absent() {
        assert_eq!(
            place(Some(Rect::new(100, 100, 0, 0)), &[MAIN], (10, 10)),
            place(None, &[MAIN], (10, 10))
        );
    }

    #[test]
    fn without_remembered_rect_uses_80_percent_of_cursor_work_area() {
        assert_eq!(
            place(None, &[MAIN], (10, 10)),
            Some(Rect::new(200, 140, 1600, 800))
        );
    }

    #[test]
    fn cursor_on_menu_bar_still_selects_that_screen() {
        assert_eq!(
            place(None, &[SECONDARY, MAIN], (10, 10)),
            Some(Rect::new(200, 140, 1600, 800))
        );
    }

    #[test]
    fn cursor_on_secondary_screen_places_first_launch_there() {
        assert_eq!(
            place(None, &[MAIN, SECONDARY], (2500, 0)),
            Some(Rect::new(2100, -120, 800, 640))
        );
    }

    #[test]
    fn cursor_on_secondary_screen_recenters_offscreen_rect_there() {
        let offscreen = Rect::new(-9000, -9000, 400, 300);
        assert_eq!(
            place(Some(offscreen), &[MAIN, SECONDARY], (2500, 0)),
            Some(Rect::new(2300, 50, 400, 300))
        );
    }

    #[test]
    fn cursor_outside_every_screen_falls_back_to_first_screen() {
        assert_eq!(
            place(None, &[MAIN, SECONDARY], (-50, -50)),
            Some(Rect::new(200, 140, 1600, 800))
        );
    }

    #[test]
    fn no_screen_gives_no_rect() {
        assert_eq!(place(Some(Rect::new(0, 0, 10, 10)), &[], (0, 0)), None);
    }
}
