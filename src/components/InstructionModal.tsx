import React from "react";
import { Modal, Button, Accordion, Row, Col } from "react-bootstrap";
import { BookOpen, Clock, Zap, HelpCircle, Layers, CheckCircle } from "lucide-react";

interface InstructionModalProps {
  show: boolean;
  onHide: () => void;
}

export const InstructionModal: React.FC<InstructionModalProps> = ({ show, onHide }) => {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title className="d-flex align-items-center gap-2">
          <BookOpen size={20} className="text-warning" />
          <span className="text-theme-main">Руководство диспетчера • Билайн Бизнес FSM</span>
        </Modal.Title>
      </Modal.Header>

      <Modal.Body className="p-4" style={{ maxHeight: "75vh", overflowY: "auto" }}>
        {/* Вводное описание системы */}
        <div className="fsm-card p-3 mb-3">
          <div className="d-flex align-items-center gap-2 mb-2">
            <span
              className="badge rounded-pill fw-bold"
              style={{
                background: "rgba(255,184,0,0.15)",
                color: "var(--beeline-yellow)",
                border: "1px solid rgba(255,184,0,0.3)"
              }}
            >
              FSM Dispatcher Pro
            </span>
            <span className="text-theme-main fw-bold">Интеллектуальная маршрутизация выездного сервиса</span>
          </div>
          <p className="text-theme-muted small mb-0" style={{ lineHeight: 1.5 }}>
            Система предназначена для автоматического распределения нарядов на подключение и обслуживание сетей ШПД между старшими инженерами с учетом временных окон клиентов, нормативов сложности и минимизации логистических издержек.
          </p>
        </div>

        {/* Разделы интерактивного руководства */}
        <Accordion defaultActiveKey="0" className="instruction-accordion">
          {/* Раздел 1: Утреннее планирование смены */}
          <Accordion.Item eventKey="0" className="fsm-card mb-2 rounded overflow-hidden">
            <Accordion.Header>
              <div className="d-flex align-items-center gap-2">
                <Clock size={16} className="text-warning" />
                <span className="fw-semibold text-theme-main">1. Регламент утреннего планирования смены</span>
              </div>
            </Accordion.Header>
            <Accordion.Body className="small text-theme-muted">
              <ol className="ps-3 mb-0">
                <li className="mb-2">
                  <b className="text-theme-main">Выбор участка ответственности:</b> В верхнем меню выберите закрепленный территориальный сектор (<i>Восток</i>, <i>Юго-восток</i>, <i>Югоцентр</i>). Либо нажмите <b>«Импорт реестра нарядов»</b> в меню действий для загрузки свежих заявок (форматы CSV, JSON).
                </li>
                <li className="mb-2">
                  <b className="text-theme-main">Проверка дежурного штата:</b> Откройте вкладку <b>«Дежурный штат»</b> для просмотра списка инженеров на смене, их типов транспорта (автомобиль, пешеход, ОТ) и матрицы квалификаций.
                </li>
                <li className="mb-2">
                  <b className="text-theme-main">Расчет маршрутов:</b> Интеллектуальный алгоритм автоматически сгруппирует наряды по районам, подберет исполнителей нужной квалификации и сожмет автопарк, задействуя минимальное количество специалистов.
                </li>
                <li>
                  <b className="text-theme-main">Печать путевой документации:</b> Нажмите <b>«Маршрутный лист»</b>, выберите инженера и нажмите <b>«Печать (А4)»</b>. Документ содержит ведомость утренней комплектации склада и почасовой график визитов с графами для подписей абонентов.
                </li>
              </ol>
            </Accordion.Body>
          </Accordion.Item>

          {/* Раздел 2: Оперативное перепланирование и экстренные события */}
          <Accordion.Item eventKey="1" className="fsm-card mb-2 rounded overflow-hidden">
            <Accordion.Header>
              <div className="d-flex align-items-center gap-2">
                <Zap size={16} className="text-danger" />
                <span className="fw-semibold text-theme-main">2. Оперативное управление и экстренные события</span>
              </div>
            </Accordion.Header>
            <Accordion.Body className="small text-theme-muted">
              <p className="mb-2">
                В течение дня диспетчер использует кнопку <b>«Оперативное управление»</b> для реагирования на изменения обстановки:
              </p>
              <ul className="ps-3 mb-0">
                <li className="mb-2">
                  <b className="text-danger">Экстренная авария:</b> Поступает аварийная заявка от Центра мониторинга. Система автоматически находит ближайшего инженера с квалификацией «Аварийные работы», <b>не прерывая его текущую начатую работу на объекте</b>, и перестраивает последующий хвост маршрута.
                </li>
                <li className="mb-2">
                  <b className="text-warning">Снятие наряда клиентом:</b> Абонент перенес визит. Наряд удаляется, последующие точки подтягиваются по времени, сокращая простой инженера.
                </li>
                <li>
                  <b className="text-info">Сход бригады с линии:</b> Поломка транспорта или болезнь сотрудника. Завершенные наряды фиксируются, а оставшиеся работы автоматически перераспределяются между соседними бригадами участка.
                </li>
              </ul>
            </Accordion.Body>
          </Accordion.Item>

          {/* Раздел 3: Объяснимый ИИ (XAI) и контроль решений */}
          <Accordion.Item eventKey="2" className="fsm-card mb-2 rounded overflow-hidden">
            <Accordion.Header>
              <div className="d-flex align-items-center gap-2">
                <HelpCircle size={16} className="text-info" />
                <span className="fw-semibold text-theme-main">3. Обоснование решений (Контроль диспетчера)</span>
              </div>
            </Accordion.Header>
            <Accordion.Body className="small text-theme-muted">
              <p className="mb-2">
                В строке каждой заявки в таблице или на метке карты доступна кнопка <b>«Почему?»</b>.
              </p>
              <p className="mb-0">
                Окно обоснования содержит подробный отчет: почему наряд получил именно данный сотрудник (проверка навыков, соблюдение интервала клиента, запас до конца смены, минимальное логистическое плечо), а также перечень причин, по которым другие бригады были отклонены.
              </p>
            </Accordion.Body>
          </Accordion.Item>

          {/* Раздел 4: Картография и визуальные индикаторы */}
          <Accordion.Item eventKey="3" className="fsm-card rounded overflow-hidden">
            <Accordion.Header>
              <div className="d-flex align-items-center gap-2">
                <Layers size={16} className="text-success" />
                <span className="fw-semibold text-theme-main">4. Картография и визуальные индикаторы</span>
              </div>
            </Accordion.Header>
            <Accordion.Body className="small text-theme-muted">
              <Row className="g-2 mb-2">
                <Col sm={6}>
                  <div className="fsm-card p-3 h-100">
                    <b className="text-theme-main d-flex align-items-center gap-1.5 mb-2">
                      <span>🗺️ Работа с картой маршрутов:</span>
                    </b>
                    <div className="d-flex flex-column gap-2 text-theme-muted">
                      <div>• <b className="text-theme-main">Стрелки на линиях:</b> Показывают точное направление движения специалиста от базы по адресам смены.</div>
                      <div>• <b className="text-theme-main">Номера на метках:</b> Порядковая очередность визитов (1, 2, 3...) в течение рабочего дня.</div>
                      <div>• <b className="text-danger">Красные метки:</b> Приоритетные аварийные выезды с наивысшим SLA.</div>
                      <div>• <b className="text-theme-main">Учет транспорта:</b> Для инженеров на авто маршрут строится по дорожной сети, для специалистов на общественном транспорте — через станции метро и пешие переходы.</div>
                      <div>• <b className="text-theme-main">Фильтр бригад:</b> Кликните на имя инженера в верхней панели карты, чтобы изолировать и просмотреть только его маршрут.</div>
                    </div>
                  </div>
                </Col>
                <Col sm={6}>
                  <div className="fsm-card p-3 h-100">
                    <b className="text-theme-main d-flex align-items-center gap-1.5 mb-2">
                      <span>📊 Индикация в графике Ганта и реестре:</span>
                    </b>
                    <div className="d-flex flex-column gap-2 text-theme-muted">
                      <div>• <span className="text-danger fw-bold">Красные блоки:</span> Срочные аварийные работы (выполняются в первую очередь).</div>
                      <div>• <span className="text-info fw-bold">Цветные полосы:</span> Время проведения работ на объекте абонента по нормативу.</div>
                      <div>• <b className="text-theme-main">Штриховка:</b> Расчетное время доезда между точками с учетом дорожной обстановки.</div>
                      <div>• <b className="text-warning">Кнопка «Логика назначения (XAI)»:</b> Мгновенное обоснование, почему наряд получил именно данный сотрудник.</div>
                    </div>
                  </div>
                </Col>
              </Row>
            </Accordion.Body>
          </Accordion.Item>
        </Accordion>
      </Modal.Body>

      <Modal.Footer>
        <Button variant="warning" className="text-dark fw-bold" onClick={onHide} size="sm">
          Понятно, перейти к работе
        </Button>
      </Modal.Footer>
    </Modal>
  );
};
