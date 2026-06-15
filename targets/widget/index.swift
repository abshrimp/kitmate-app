import WidgetKit
import SwiftUI

// メインアプリと共有する App Group。app.json の application-groups と一致させること。
private let appGroup = "group.com.abshrimp.kitmate"
private let payloadKey = "payload"

// 各時限の開始時刻 (JS lib/terms.ts の PERIOD_TIMES と一致)
private let periodStart: [Int: String] = [1: "8:50", 2: "10:30", 3: "12:50", 4: "14:30", 5: "16:10"]

// MARK: - 共有ペイロード (JS 側 WidgetPayload と一致)

struct WClass: Decodable {
  let period: Int
  let start: String
  let end: String
  let name: String
  let room: String
  let color: String?
}

struct WAssignment: Decodable {
  let title: String
  let course: String
  let dueAt: Double
  let dueLabel: String
  let remainingLabel: String
}

struct WPayload: Decodable {
  let updatedAt: Double
  let dateLabel: String
  let isWeekend: Bool
  let classes: [WClass]
  let assignment: WAssignment?
}

private func loadPayload() -> WPayload? {
  guard
    let defaults = UserDefaults(suiteName: appGroup),
    let raw = defaults.string(forKey: payloadKey),
    let data = raw.data(using: .utf8)
  else { return nil }
  return try? JSONDecoder().decode(WPayload.self, from: data)
}

private func colorFromHex(_ hex: String?) -> Color {
  guard var s = hex else { return .accentColor }
  if s.hasPrefix("#") { s.removeFirst() }
  guard s.count == 6, let v = UInt64(s, radix: 16) else { return .accentColor }
  return Color(
    red: Double((v & 0xFF0000) >> 16) / 255,
    green: Double((v & 0x00FF00) >> 8) / 255,
    blue: Double(v & 0x0000FF) / 255
  )
}

// MARK: - Timeline (全ウィジェット共通)

struct Entry: TimelineEntry {
  let date: Date
  let payload: WPayload?
}

struct Provider: TimelineProvider {
  func placeholder(in context: Context) -> Entry { Entry(date: Date(), payload: nil) }
  func getSnapshot(in context: Context, completion: @escaping (Entry) -> Void) {
    completion(Entry(date: Date(), payload: loadPayload()))
  }
  func getTimeline(in context: Context, completion: @escaping (Timeline<Entry>) -> Void) {
    let entry = Entry(date: Date(), payload: loadPayload())
    let next = Calendar.current.date(byAdding: .hour, value: 1, to: Date()) ?? Date()
    completion(Timeline(entries: [entry], policy: .after(next)))
  }
}

// MARK: - 共通パーツ

private func header(_ title: String, _ right: String) -> some View {
  HStack {
    Text(title).font(.caption).bold().foregroundColor(.accentColor)
    Spacer()
    Text(right).font(.caption2).foregroundColor(.secondary)
  }
}

@ViewBuilder
private func widgetBackground<V: View>(_ content: V) -> some View {
  if #available(iOS 17.0, *) {
    content.containerBackground(.fill.tertiary, for: .widget)
  } else {
    content.padding()
  }
}

// MARK: - 時間割ウィジェット (1〜5限を縦に分割)

struct TimetableView: View {
  var entry: Entry
  var body: some View {
    VStack(alignment: .leading, spacing: 3) {
      header("KITmate", entry.payload?.dateLabel ?? "")
      if let payload = entry.payload {
        if payload.isWeekend {
          Text("今日は授業がありません").font(.footnote).foregroundColor(.secondary).padding(.top, 4)
        } else {
          ForEach(1...5, id: \.self) { p in
            let cls = payload.classes.first { $0.period == p }
            HStack(spacing: 6) {
              Text("\(p)")
                .font(.caption2).bold()
                .foregroundColor(cls != nil ? .white : .secondary)
                .frame(width: 18, height: 18)
                .background(cls != nil ? colorFromHex(cls?.color) : Color.gray.opacity(0.25))
                .cornerRadius(5)
              Text(periodStart[p] ?? "").font(.caption2).foregroundColor(.secondary).frame(width: 38, alignment: .leading)
              Text(cls?.name ?? "—").font(.caption).foregroundColor(cls != nil ? .primary : .secondary).lineLimit(1)
              Spacer(minLength: 4)
              if let room = cls?.room, !room.isEmpty {
                Text(room).font(.caption2).foregroundColor(.secondary)
              }
            }
          }
        }
      } else {
        Text("アプリを開いて更新").font(.footnote).foregroundColor(.secondary).padding(.top, 4)
      }
      Spacer(minLength: 0)
    }
    .padding(12)
  }
}

// MARK: - 課題ウィジェット (締切 / 残り時間)

struct AssignmentView: View {
  var entry: Entry
  /// true: 残り時間をライブ表示 / false: 締切日時を表示
  var remaining: Bool

  var body: some View {
    VStack(alignment: .leading, spacing: 2) {
      header(remaining ? "課題まで" : "課題の締切", entry.payload?.dateLabel ?? "")
      if let a = entry.payload?.assignment {
        Text(a.course).font(.caption2).foregroundColor(.secondary).lineLimit(1)
        Text(a.title).font(.subheadline).bold().lineLimit(2).padding(.top, 1)
        Spacer(minLength: 2)
        if remaining {
          if a.dueAt > Date().timeIntervalSince1970 {
            Text(Date(timeIntervalSince1970: a.dueAt), style: .relative)
              .font(.title2).bold().foregroundColor(.orange)
          } else {
            Text("期限切れ").font(.title2).bold().foregroundColor(.red)
          }
        } else {
          Text(a.dueLabel).font(.title2).bold().foregroundColor(.orange)
        }
      } else if entry.payload == nil {
        Text("アプリを開いて更新").font(.footnote).foregroundColor(.secondary).padding(.top, 4)
      } else {
        Text("課題はありません").font(.footnote).foregroundColor(.secondary).padding(.top, 4)
      }
      Spacer(minLength: 0)
    }
    .padding(12)
  }
}

// MARK: - Widgets

struct TimetableWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "KitmateTimetable", provider: Provider()) { entry in
      widgetBackground(TimetableView(entry: entry))
    }
    .configurationDisplayName("KITmate 時間割")
    .description("今日の時間割 (1〜5限)")
    .supportedFamilies([.systemMedium, .systemLarge])
  }
}

struct AssignmentDueWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "KitmateAssignmentDue", provider: Provider()) { entry in
      widgetBackground(AssignmentView(entry: entry, remaining: false))
    }
    .configurationDisplayName("KITmate 課題の締切")
    .description("直近の課題の締切日時")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

struct AssignmentRemainingWidget: Widget {
  var body: some WidgetConfiguration {
    StaticConfiguration(kind: "KitmateAssignmentRemaining", provider: Provider()) { entry in
      widgetBackground(AssignmentView(entry: entry, remaining: true))
    }
    .configurationDisplayName("KITmate 課題まで")
    .description("直近の課題までの残り時間")
    .supportedFamilies([.systemSmall, .systemMedium])
  }
}

@main
struct KitmateWidgetBundle: WidgetBundle {
  var body: some Widget {
    TimetableWidget()
    AssignmentDueWidget()
    AssignmentRemainingWidget()
  }
}
