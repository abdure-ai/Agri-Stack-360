"""ATI Farmer Profile System adapter (M18) against a mock REST server."""

import json

import httpx
import pytest

from backend.advisory.adapters.platform import ATIFarmerProfileSource
from backend.advisory.providers import ProviderError
from tests.conftest import add_user

PHONE = "0933000001"


@pytest.fixture
def farmer(platform):
    add_user(platform, 1, phone=PHONE, name="Local Name", consent_data=1, consent_alerts=1)
    return platform


def _mock(handler):
    seen = []

    def wrapped(request: httpx.Request):
        seen.append(request)
        return handler(request)

    return httpx.Client(transport=httpx.MockTransport(wrapped)), seen


def test_ati_fields_fill_the_local_record(farmer):
    record = {"full_name": "ATI Name", "kebele_name": "Kebele 01", "woreda_name": "Dewa Cheffa",
              "main_plot": {"latitude": "10.78", "longitude": 39.85, "altitude_m": None}, "national_id": "SECRET"}
    client, seen = _mock(lambda r: httpx.Response(200, json={"farmers": [record]}))
    src = ATIFarmerProfileSource(farmer, base_url="https://ati.test/api/", api_key="k", client=client)
    p = src.get(1)
    assert seen[0].url == httpx.URL("https://ati.test/api/farmers?phone=" + PHONE)
    assert seen[0].headers["authorization"] == "Bearer k"
    assert (p.name, p.kebele, p.woreda, p.latitude, p.longitude) == ("ATI Name", "Kebele 01", "Dewa Cheffa", 10.78, 39.85)
    assert p.altitude_m is None and p.consent_data and p.consent_alerts      # consent stays local
    assert "SECRET" not in json.dumps(p.__dict__)                           # unmapped fields are ignored


def test_custom_mapping_and_unknown_fields(farmer):
    client, _ = _mock(lambda r: httpx.Response(200, json={"farmers": [{"n": "Mapped"}]}))
    assert ATIFarmerProfileSource(farmer, base_url="https://ati.test", mapping={"name": "n"}, client=client).get(1).name == "Mapped"
    with pytest.raises(ValueError):
        ATIFarmerProfileSource(farmer, base_url="https://ati.test", mapping={"consent_data": "x"})


def test_not_found_or_ambiguous_keeps_local(farmer):
    for response in (httpx.Response(404), httpx.Response(200, json={"farmers": []}),
                     httpx.Response(200, json={"farmers": [{"full_name": "A"}, {"full_name": "B"}]})):
        client, _ = _mock(lambda r, resp=response: resp)
        assert ATIFarmerProfileSource(farmer, base_url="https://ati.test", client=client).get(1).name == "Local Name"


def test_outage_falls_back_unless_strict(farmer):
    def down(request):
        raise httpx.ConnectError("down")

    client, _ = _mock(down)
    assert ATIFarmerProfileSource(farmer, base_url="https://ati.test", client=client).get(1).name == "Local Name"
    client, _ = _mock(lambda r: httpx.Response(500))
    with pytest.raises(ProviderError):
        ATIFarmerProfileSource(farmer, base_url="https://ati.test", client=client, strict=True).get(1)


def test_selected_by_setting(farmer, monkeypatch):
    from backend.advisory import registry

    monkeypatch.setenv("ADVISORY_PROFILE_PROVIDER", "ati")
    assert isinstance(registry.farmer_profiles(farmer), ATIFarmerProfileSource)
