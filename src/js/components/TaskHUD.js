var React = require('react');
var util = require('utils/util');
var api = require('utils/api');
import {IconButton} from 'material-ui';

export default class TaskHUD extends React.Component {
  static propTypes = {
    task: React.PropTypes.object,
    onTaskUpdate: React.PropTypes.func
  }

  static defaultProps = {
    task: null,
    onTaskUpdate: null
  }

  constructor(props) {
      super(props);
      this.state = {
        notified: false
      }
      this.interval_id = null;
      this.POMODORO_MINS = 2; // 25;
  }

  componentWillReceiveProps(nextProps) {
    let have_task = !!this.props.task;
    let will_have_task = !!nextProps.task;
    if (have_task != will_have_task) {
      if (will_have_task) this.start_interval();
      else this.stop_interval();
    }
  }

  start_interval() {
    this.interval_id = window.setInterval(this.refresh_timer_count.bind(this), 30*1000);
  }

  stop_interval() {
    if (this.interval_id) window.clearInterval(this.interval_id);
  }

  refresh_timer_count() {
    let {task} = this.props;
    let {notified} = this.state;
    let mins_reached = parseInt(this.get_seconds() / 60);
    let target_mins = parseInt(task.timer_target_ms / 1000 / 60);
    let st = {};
    if (target_mins > 0 && mins_reached == target_mins && !notified) {
      util.notify("Target Reached", `${mins_reached} minutes logged on "${task.title}"`);
      st.notified = true;
    }
    this.setState(st); // Another way to refresh UI?
  }

  get_seconds() {
    let {task} = this.props;
    let ms_on_timer = 0;
    if (task.timer_last_start > 0) ms_on_timer = util.nowTimestamp() - task.timer_last_start;
    ms_on_timer += task.timer_pending_ms;
    return ms_on_timer / 1000;
  }

  playing() {
    let {task} = this.props;
    return task.timer_last_start > 0;
  }

  timer_update(params) {
    let {task} = this.props;
    params.id = task.id;
    api.post("/api/task", params, (res) => {
      if (res.task) this.props.onTaskUpdate(res.task);
    });
  }

  start_timer() {
    this.timer_update({
      timer_last_start: util.nowTimestamp()
    });
  }

  pause_timer() {
    this.timer_update({
      timer_last_start: 0,
      timer_pending_ms: this.get_seconds() * 1000
    });
  }

  stop_timer() {
    let {task} = this.props;
    this.timer_update({
      timer_last_start: 0,
      wip: 0,
      timer_total_ms: task.timer_total_ms + this.get_seconds() * 1000,
      timer_pending_ms: 0
    });
  }

  reset_timer() {
    this.timer_update({
      timer_last_start: 0,
      timer_pending_ms: 0
    });
  }

  set_pomodoro() {
    this.setState({notified: false}, () => {
      this.timer_update({
        timer_target_ms: this.POMODORO_MINS * 60 * 1000
      });
    })
  }

  render_controls() {
    let {task} = this.props;
    let playing = this.playing();
    let controls = [];
    if (playing) {
      controls.push(<IconButton iconClassName="material-icons" onClick={this.pause_timer.bind(this)} tooltipPosition="top-center" tooltip="Pause Logging">pause</IconButton>)

    }
    else controls.push(<IconButton iconClassName="material-icons" onClick={this.start_timer.bind(this)} tooltipPosition="top-center" tooltip="Start Logging">play_arrow</IconButton>)
    controls.push(<IconButton iconClassName="material-icons" onClick={this.set_pomodoro.bind(this)} tooltipPosition="top-center" tooltip={`Set Pomodoro Timer (${this.POMODORO_MINS} minutes)`}>timer</IconButton>)
    controls.push(<IconButton iconClassName="material-icons" onClick={this.stop_timer.bind(this)} tooltipPosition="top-center" tooltip="Stop and Save Logged Time">stop</IconButton>)
    if (this.get_seconds() > 0) controls.push(<IconButton iconClassName="material-icons" onClick={this.reset_timer.bind(this)} tooltipPosition="top-center" tooltip="Reset Timer">restore</IconButton>)
    return controls;
  }

  render() {
    let t = this.props.task;
    if (!t) return <span></span>
    let secs = this.get_seconds();
    let _playing;
    let time_cls = "time";
    let timer_state = "paused";
    if (this.playing()) {
      _playing = <span className="playing-orb"></span>
      time_cls += " playing";
      timer_state = "running";
    }
    let _target, _progress;
    _progress = secs > 0 ? util.secsToDuration(secs, {no_seconds: true, zero_text: "Less than a minute"}) : "--";
    if (t.timer_target_ms > 0) _target = "Target: " + util.secsToDuration(t.timer_target_ms / 1000, {no_seconds: true})
    return (
      <div className="taskHUD">
        <div className="row">
          <div className="col-sm-4">
            <div className="hud-label">work in progress</div>
            <div className="name">{ t.title }</div>
          </div>
          <div className="col-sm-4">
            { this.render_controls() }
          </div>
          <div className="col-sm-4">
            <div className="hud-label">{`Logging (${timer_state})`} { _target }</div>
            <div className="timers">
              <div className={time_cls}>{ _playing }{ _progress }</div>
            </div>
          </div>
        </div>

      </div>
    );
  }
}